#!/usr/bin/env node

const { version, description } = require('../package.json');

const { Command } = require('commander');

// https://github.com/paulmillr/scure-bip39
// Secure, audited & minimal implementation of BIP39 mnemonic phrases.
const { generateMnemonic, mnemonicToSeedSync } = require('@scure/bip39');
// Word lists not imported by default as that would increase bundle sizes too much as in case of bitcoinjs/bip39
// Use default english world list similiar to bitcoinjs/bip39
// Backward compatible with bitcoinjs/bip39 dependency
// Very small in size as compared to bitcoinjs/bip39 wordlist
// Reference: https://github.com/paulmillr/scure-bip39
const { wordlist } = require('@scure/bip39/wordlists/english');

// https://github.com/paulmillr/scure-bip32
// Secure, audited & minimal implementation of BIP32 hierarchical deterministic (HD) wallets.
const { HDKey } = require('@scure/bip32');

const { bytesToHex } = require('@stacks/common');
const { 
    compressPrivateKey,
    getPrivateKeyAddress,
    publicKeyToBtcAddress
} = require('@stacks/encryption');

const wif = require('wif');
const ecc = require('tiny-secp256k1');
const { address, payments, networks, initEccLib } = require('bitcoinjs-lib');
const c32check = require('c32check');


const c32alphabet = /^[0-9A-HJKMNP-TV-Z]{1,10}$/;
const b58alphabet = /^[0-9A-Za-z]{1,10}$/;

// Init ECC lib
initEccLib(ecc);

// Program CLI parser
const program = new Command(); 

program
    .name('stacks-vanity')
    .description(description)
    .version(version)
    .argument('<slice...>', 'vanity c32 slices to search for, like 123 or C0PA')
    .option('-b, --bitcoin', 'search in Bitcoin segwit address instead of Stacks')
    .option('-c, --case-sensitive', 'case sensitive (only valid for Bitcoin)')
    .option('-n, --native', 'search in Bitcoin native segwit address instead (only valid for Bitcoin)')
    .option('-r, --taproot', 'search in Bitcoin taproot address instead (only valid for Bitcoin)')
    .option('-s, --suffix', 'suffix instead of prefix')
    .option('-t, --testnet', 'testnet instead of mainnet');

program.parse();

const bitcoin = program.opts().bitcoin;
const native = program.opts().native;
const taproot = program.opts().taproot;
const uppercase = bitcoin ? !program.opts().caseSensitive : true;
const suffix = program.opts().suffix;
const testnet = program.opts().testnet;

// Check c32 or base58 alphabet characters
const vanitySlices = program.args.map(slice => {
    const match = uppercase ? slice.toUpperCase() : slice;
    if(!(bitcoin ? b58alphabet : c32alphabet).test(match)) {
        program.error(`invalid vanity slice "${slice}"`);
    }
    return match;
});

// Cryptography stuff

const KEY_DERIVATION_PATH   = `m/44'/5757'/0'/0/0`;
const SEGWIT_DERIVATION_PATH   = `m/49'/${testnet ? '1' : '0'}'/0'/0/0`;
const NATIVE_DERIVATION_PATH   = `m/84'/${testnet ? '1' : '0'}'/0'/0/0`;
const TAPROOT_DERIVATION_PATH   = `m/86'/${testnet ? '1' : '0'}'/0'/0/0`;
const BITCOIN_WIF_TESTNET   = 239;
const BITCOIN_WIF           = 128;
const BITCOIN_PUBKEYHASH_TESTNET    = 111;
const BITCOIN_PUBKEYHASH            = 0;

const generateSecretKey = (entropy = 256) => generateMnemonic(wordlist, entropy);

const generateWallet = (secretKey) => {
    const mnemonic = secretKey || generateSecretKey();
    const rootPrivateKey = mnemonicToSeedSync(mnemonic);
    const rootNode = HDKey.fromMasterSeed(rootPrivateKey);
    const childKey = rootNode.derive(KEY_DERIVATION_PATH);

    const wifVersion = testnet ? BITCOIN_WIF_TESTNET : BITCOIN_WIF;
    const walletImportFormat = wif.encode(wifVersion, Buffer.from(childKey.privateKey), true);

    const publicKey = Buffer.from(childKey.publicKey);
    const legacyAddress = publicKeyToBtcAddress(
        publicKey,
        testnet ? BITCOIN_PUBKEYHASH_TESTNET : BITCOIN_PUBKEYHASH
    );
    const { hash, version } = address.fromBase58Check(legacyAddress);
    const stacksAddress = c32check.b58ToC32(address.toBase58Check(hash, version));

    const network = networks[testnet ? 'testnet' : 'bitcoin'];

    let bitcoinAddress;
    if (native) {
        const derivation = rootNode.derive(NATIVE_DERIVATION_PATH);
        bitcoinAddress = payments.p2wpkh({pubkey: Buffer.from(derivation.publicKey), network}).address;
    } else if (taproot) {
        const derivation = rootNode.derive(TAPROOT_DERIVATION_PATH);
        const childNodeXOnlyPubkey = derivation.publicKey.slice(1, 33);
        bitcoinAddress = payments.p2tr({pubkey: Buffer.from(childNodeXOnlyPubkey), network}).address;
    } else {
        const derivation = rootNode.derive(SEGWIT_DERIVATION_PATH);
        bitcoinAddress = payments.p2sh({
            redeem: payments.p2wpkh({pubkey: Buffer.from(derivation.publicKey), network}),
            network
        }).address;
    }

    return {
        mnemonic,
        addresses: {
            bitcoin: bitcoinAddress,
            stacks: stacksAddress
        },
        wif: walletImportFormat
    };
}

// Async tasks

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const tasks = vanitySlices.map(async slice => {
    console.log(`Searching for "${slice}" ${suffix ? 'suffix' : 'prefix'}ed addresses...`);
    let mileage = 0;
    while (true) {
        ++mileage;
        const wallet = generateWallet();
        let stx = wallet.addresses.stacks.substring(2);
        let btc = wallet.addresses.bitcoin.substring(native || taproot ? 4 : 1);
        if (uppercase) btc = btc.toUpperCase();
        if (suffix ? (bitcoin ? btc : stx).endsWith(slice) : (bitcoin ? btc : stx).startsWith(slice)) {
            console.log(`# ${slice} found:`);
            console.log('address:', wallet.addresses.stacks);
            console.log('bitcoin:', wallet.addresses.bitcoin);
            console.log('wif:', wallet.wif);
            console.log('mnemonic:', wallet.mnemonic);
            console.log('mileage:', mileage);
            console.log('-------------------------------');
            return wallet;
        }
        await delay(0);
    }
});

// Main execution

Promise.all(tasks).then(wallets => {
    console.log(`done searching for ${wallets.length} vanity addresses.`);
    process.exit(0);
});
