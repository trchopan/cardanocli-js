const CardanocliJs = require("../index.js");
const os = require("os");
const path = require("path");

const dir = path.join(os.homedir(), "testnet");
const shelleyPath = path.join(
  os.homedir(),
  "testnet",
  "testnet-shelley-genesis.json"
);

const cardanocliJs = new CardanocliJs({
  network: "testnet-magic 1097911063",
  dir: dir,
  shelleyGenesisPath: shelleyPath,
});

const createWallet = (account) => {
  const payment = cardanocliJs.addressKeyGen(account);
  const stake = cardanocliJs.stakeAddressKeyGen(account);
  cardanocliJs.stakeAddressBuild(account);
  cardanocliJs.addressBuild(account, {
    paymentVkey: payment.vkey,
    stakeVkey: stake.vkey,
  });
  return cardanocliJs.wallet(account);
};

const registerWallet = (wallet) => {
  let account = wallet.name;
  let stakeAddressDeposit = cardanocliJs.queryProtocolParameters().stakeAddressDeposit;
  let stakeCert = cardanocliJs.stakeAddressRegistrationCertificate(account);
  let paymentAddress = cardanocliJs.wallet(account).paymentAddr;
  let balance = cardanocliJs.wallet(account).balance().value;
  let tx = {
    txIn: cardanocliJs.queryUtxo(paymentAddress),
    txOut: [
      { 
        address: paymentAddress,
        value: {
          ...balance,
          lovelace: balance.lovelace - stakeAddressDeposit,
        } 
      },
    ],
    certs: [{ cert: stakeCert }],
    witnessCount: 2,
  };
  let txBodyRaw = cardanocliJs.transactionBuildRaw(tx);
  let fee = cardanocliJs.transactionCalculateMinFee({
    ...tx,
    txBody: txBodyRaw,
  });
  tx.txOut[0].value.lovelace -= fee;
  let txBody = cardanocliJs.transactionBuildRaw({ ...tx, fee });
  let txSigned = cardanocliJs.transactionSign({
    txBody,
    signingKeys: [
      cardanocliJs.wallet(account).payment.skey,
      cardanocliJs.wallet(account).stake.skey,
    ],
  });

  return txSigned;
};

let wallet = createWallet("Test");

console.log(wallet);

let tx = registerWallet(wallet);

let txHash = cardanocliJs.transactionSubmit(tx);

console.log("TxHash: " + txHash);
