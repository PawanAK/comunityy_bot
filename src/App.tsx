import React, { useState, ChangeEvent, useEffect } from "react";
import goodimg from "../src/assets/good.jpg";
import evilimg from "../src/assets/evil.jpg";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Aptos,
  Account,
  Ed25519PrivateKey,
  Serializer,
  MoveVector,
  U64,
} from "@aptos-labs/ts-sdk";

import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import "./App.css";

interface Range {
  min: number;
  max: number;
}

interface NFTItem {
  title: string;
  price: number;
  Image: string;
  keywords: string;
  negative: string;
  id: number;
}

export const aptos = new Aptos();
export const moduleAddress =
  "d7e864c4e6350c95955ad62eaacfc53f19eaa1ee2c197a7f9b36284c363889a8";

const getFaBalance = async (
  ownerAddress: string,
  assetType: string
): Promise<number> => {
  const data = await aptos.getCurrentFungibleAssetBalances({
    options: {
      where: {
        owner_address: { _eq: ownerAddress },
        asset_type: { _eq: assetType },
      },
    },
  });
  return data[0]?.amount ?? 0;
};

const privateKey = new Ed25519PrivateKey(
  "0xc18a9a158cc0ccfe95798f526cfb9b4ee07ade0f0216d9434d02fb8dc3f56bb0"
);
const admin = Account.fromPrivateKey({ privateKey });

const App: React.FC = () => {
  const [range, setRange] = useState<Range>({ min: 1, max: 10 });
  const [guesses, setGuesses] = useState<string>("1");
  const [cost, setCost] = useState<number>(0);
  const [result, setResult] = useState<string | null>(null);
  const [win, setWin] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const [showGame, setShowGame] = useState<boolean>(false);
  const { account, connected } = useWallet();
  const token =
    "0x65735cb9546ca07af21f4bef98ca581e30c3bdedf32c2a5d6c5e1419e95dee53";

  useEffect(() => {
    const guessArray = guesses.split(",").map(Number);
    const totalCost = guessArray.length;
    setCost(totalCost);
    console.log(win);
  }, [guesses]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (account) {
        const balance = await getFaBalance(account.address, token);
        setBalance(balance / 100000000);
      }
    };

    if (connected) {
      fetchBalance();
    }
  }, [account, connected]);
  async function mintCoin(admin: Account, receiver: string, amount: number): Promise<string> {
    const transaction = await aptos.transaction.build.simple({
      sender: admin.accountAddress,
      data: {
        function: `${moduleAddress}::tele_point::mint`,
        functionArguments: [receiver, amount],
      },
    });

    const senderAuthenticator = await aptos.transaction.sign({ signer: admin, transaction });
    const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

    return pendingTxn.hash;
  }
  async function transferCoin(
    admin: Account,
    fromAddress: string,
    toAddress: string,
    amount: number,
  ): Promise<string> {
    const transaction = await aptos.transaction.build.simple({
      sender: admin.accountAddress,
      data: {
        function: `${admin.accountAddress}::tele_point::transfer`,
        functionArguments: [fromAddress, toAddress, amount],
      },
    });

    const senderAuthenticator = await aptos.transaction.sign({ signer: admin, transaction });
    const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

    return pendingTxn.hash;
  }
  const start_movelette = async (
    min: number,
    max: number,
    data: U64[],
    amt: number,
    winning_amt: number
  ) => {
    if (!account) return [];
    const serializer = new Serializer();
    const movevector = new MoveVector<U64>(data);
    movevector.serialize(serializer);
    const transaction = await aptos.transaction.build.simple({
      sender: admin.accountAddress,
      data: {
        function: `${moduleAddress}::tele_point::winner_decision`,
        functionArguments: [
          account.address,
          min,
          max,
          movevector,
          amt,
          winning_amt,
        ],
      },
    });
    try {
      const senderAuthenticator = await aptos.transaction.sign({
        signer: admin,
        transaction,
      });
      const response = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });
      await aptos.waitForTransaction({ transactionHash: response.hash });
    } catch (error: any) {
      console.error(error);
    } finally {
      const oldbalance = balance;
      const newbalance = await getFaBalance(account.address, token);
      setBalance(newbalance / 100000000);
      setWin(newbalance !== oldbalance * 100000000 - amt);
      setResult(
        `Result: ${newbalance !== oldbalance * 100000000 - amt ? "Win" : "Lose"
        }`
      );
    }
  };

  const nftData: NFTItem[] = [
    { title: "Good Pack", price: 30, Image: goodimg, id: 1, negative: "Evil Expression, Scowl, Frown, No beard,Sarcastic Smile,blurry images", keywords: "Cartoon, Exagerated,Handsome, Beautiful, Detailed Animation, Animated, No Background, Black Background, Happy, Long hair, Always bearded" },
    { title: "Evil Pack", price: 30, Image: evilimg, id: 2, negative: "Good Expression, Smile, blurry images", keywords: "Evil ,Cartoon, Exagerated,Handsome, Beautiful, Detailed Animation, Animated, No Background, Black Background, Happy, Long hair, Always bearded, Sarcastic smile" },
  ];

  const mint_nftpack = (amt: number, prompt: string, negative_prompt: string) => {
    var data = {
      action: "Add Sticker",
      prompt: prompt,
      wallet: account?.address,
      negative_prompt: negative_prompt,
    };
    // Transfer TELE to admin.walleadress
    handletokenTransfer(amt);
    window.Telegram.WebApp.sendData(JSON.stringify(data));
  };

  useEffect(() => {
    if (window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
    }
  }, []);

  const handleRangeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRange((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
  };

  const handleGuessesChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGuesses(e.target.value);
  };

  const handleSubmit = () => {
    const guessArray = guesses.split(",").map(Number);
    const u64_guessArray = guessArray.map((item) => new U64(item));
    const len = guessArray.length;
    const amt = len * 10 * 10000000;
    const winamt =
      (range.max - range.min + 1 - guessArray.length) * 10 * 10000000;
    start_movelette(range.min, range.max, u64_guessArray, amt, winamt);
  };

  const handleMintToken = async () => {
    if (account) {
      mintCoin(admin, account?.address, 100 * 100000000);
      const newbalance = await getFaBalance(account.address, token);
      setBalance(newbalance / 100000000);
    }
  };
  const handletokenTransfer = async (amt: number) => {
    if (account) {
      transferCoin(admin, account?.address, admin.accountAddress.toString(), amt * 100000000);
      const newbalance = await getFaBalance(account.address, token);
      setBalance(newbalance / 100000000);
    }
  };
  const handleRedeemClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div className="landing-page">
      <header className="header">
        <nav className="navbar">
          <div className="logo">Move-Lette Arcade</div>
        </nav>
      </header>

      <section className="hero">
        <h1>Welcome to Move-Lette Arcade</h1>
        <p>Step into the future of gaming with decentralized technology!</p>
        <div className="arcade-instructions">
          <h2>How to Play</h2>
          <ol>
            <li>Buy $TELE tokens</li>
            <li>Play games to earn $TELE</li>
            <li>Use $TELE tokens to generate stickers</li>
          </ol>
        </div>
        <button className="cta-button" onClick={() => setShowGame(true)}>
          Get Started
        </button>
      </section>

      {showGame && (
        <div className="game-section">
          {!connected ? (
            <div className="flex justify-center mb-4">
              <WalletSelector />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center mb-4">
              <button
                className="bg-blue-500 text-white py-2 px-4 rounded mb-2"
                onClick={() => {
                  if (account?.address) {
                    navigator.clipboard.writeText(account.address);
                  } else {
                    console.error("No address available to copy.");
                  }
                }}>
                {account?.address
                  ? `${account.address.slice(0, 6)}...${account.address.slice(
                    -4
                  )}`
                  : "No Address"}
              </button>
              <div className="text-black text-center mb-2">
                <p>Balance: $TELE {balance.toFixed(2)}</p>
              </div>
              <button
                onClick={handleRedeemClick}
                className="bg-yellow-500 text-white py-2 px-4 rounded mb-2">
                Redeem
              </button>
              <button
                onClick={() => handleMintToken()}
                className="bg-green-500 text-white py-2 px-4 rounded mb-2">
                Buy $TELE Tokens
              </button>
            </div>
          )}
          {connected && (
            <>
              <h1 className="text-2xl font-bold mb-4 text-center">
                Move-Lette
              </h1>
              <div className="flex mb-4">
                <input
                  type="number"
                  name="min"
                  value={range.min}
                  onChange={handleRangeChange}
                  className="border p-2 mr-2 w-full arcade-input"
                />
                <span className="self-center">to</span>
                <input
                  type="number"
                  name="max"
                  value={range.max}
                  onChange={handleRangeChange}
                  className="border p-2 ml-2 w-full arcade-input"
                />
              </div>
              <input
                type="text"
                value={guesses}
                onChange={handleGuessesChange}
                placeholder="Enter your guesses (e.g., 1,4,5)"
                className="border p-2 w-full mb-4 arcade-input"
              />
              <button
                onClick={handleSubmit}
                className="bg-blue-500 text-white py-2 px-4 rounded mb-4 w-full arcade-button">
                Set Range & Start
              </button>
              <div className="text-center mb-4 arcade-info">
                <p>Cost = {cost} $TELE</p>
                <p>
                  Winning Chance = {guesses.split(",").length}/
                  {range.max - range.min + 1} ={" "}
                  {(
                    guesses.split(",").length /
                    (range.max - range.min + 1)
                  ).toFixed(1)}
                </p>
                <p>
                  Potential Win:{" "}
                  {(range.max - range.min + 1 - guesses.split(",").length) * 1}{" "}
                  $TELE
                </p>
              </div>
              {result && (
                <div className="text-xl font-bold mb-4 text-center arcade-result">
                  <p>{result}</p>
                </div>
              )}
              {showModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-2/3 arcade-modal">
                    <h2 className="text-2xl font-bold mb-4 text-center">
                      Redeem Through Stickers
                    </h2>
                    <div className="flex justify-between items-center mb-4">
                      <p>Balance: $TELE {balance.toFixed(2)}</p>
                      <button className="bg-green-500 text-white py-2 px-4 rounded">
                        Order!
                      </button>
                    </div>
                    <div className="flex justify-center space-x-4">
                      {nftData.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col items-center bg-gray-200 p-4 rounded-lg arcade-item">
                          <img
                            src={item.Image}
                            alt={item.title}
                            className="w-32 h-32 mb-2"
                          />
                          <p className="text-lg">
                            {item.title} - $TELE {item.price}
                          </p>
                          <button
                            onClick={() => mint_nftpack(item.price, item.keywords, item.negative)}
                            className="mt-2 bg-yellow-500 text-white py-2 px-4 rounded arcade-button">
                            Mint
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleCloseModal}
                      className="mt-4 bg-red-500 text-white py-2 px-4 rounded arcade-button">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
