# @biteine/stacks-vanity
Vanity account addresses creation CLI tool for Stacks chain

## Installation

```bash
npm install -g stacks-vanity
```

## Usage

```bash
% stacks-vanity --help
Usage: stacks-vanity [options] <slice...>

Vanity account addresses creation CLI tool for Stacks Bitcoin L2 chain

Arguments:
  slice                 vanity c32 slices to search for, like 123 or C0PA

Options:
  -V, --version         output the version number
  -b, --bitcoin         search in Bitcoin segwit address instead of Stacks
  -c, --case-sensitive  case sensitive (only valid for Bitcoin)
  -n, --native          search in Bitcoin native segwit address instead (only valid for Bitcoin)
  -r, --taproot         search in Bitcoin taproot address instead (only valid for Bitcoin)
  -s, --suffix          suffix instead of prefix
  -t, --testnet         testnet instead of mainnet
  -h, --help            display help for command

% _
```

## Example

For searching for Bitcoin native segwit addresses with sufixes 00 and AC:

```bash
% stacks-vanity -bns 00 ac
Searching for "00" suffixed addresses...
Searching for "AC" suffixed addresses...
# AC found:
address: SP2HEQ76AEESY6XK8P906CSAQWQ7NCPJCB42W9KYZ
bitcoin: bc1q7xzrhsgn8khpkgnq7f8kpz35qq5ddlwmxrcdac
wif: L4sHvuyWhRh2ZyBVSe9Dt5R9WM69NxeFEV5HvUsogJpVYVhZkZau
mnemonic: teach wonder deposit sign catch vital habit antenna proof degree social admit buffalo more never couple same add vacuum dinner exhibit master exclude ring
mileage: 931
-------------------------------
# 00 found:
address: SP318TQ8FKMYZK5F7FB15AV38TC7DNH650FZFZ1VS
bitcoin: bc1qxznc33gux50nyv4eu2rkuj3368krwuwt2lcg00
wif: KwhAYpmVAnxB46dm2VTG9WRmnjBe8b6WzQMEVBsZhst2Cveu74Md
mnemonic: cigar nasty drama forget zero holiday trial jar clump segment hedgehog orient oblige daring pipe tape liberty gain brain post script intact mushroom cave
mileage: 2838
-------------------------------
done searching for 2 vanity addresses.
% _
```

**NOTE:** Please DO NOT use these addresses because their private key is now public domain!

For each result, in the first line you have your new vanity address, then the mnemonic passphrase to import to your wallet. Please store these somewhere safe.

`stacks-vanity` works locally on your command line and doesn't connect to any server, so you can be sure you are the only one knowing your passphrase or private key.

Enjoy your vanity addresses! <3 :)
