import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Ranking() {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    const data = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = parseFloat(localStorage.getItem(key));
      if (!isNaN(value)) data.push({ address: key, btc: value });
    }
    data.sort((a, b) => b.btc - a.btc);
    setRanking(data);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-3xl font-bold mb-6">BTC 全自动 - 排行榜</h1>

      <div className="w-full max-w-md bg-gray-800 p-6 rounded-2xl shadow-lg">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-2">排名</th>
              <th className="pb-2">地址</th>
              <th className="pb-2">BTC</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item, index) => (
              <tr key={index} className="border-t border-gray-700">
                <td className="py-2">{index + 1}</td>
                <td className="py-2">{item.address}</td>
                <td className="py-2">{item.btc.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        to="/"
        className="mt-6 px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition"
      >
        返回首页
      </Link>
    </div>
  );
}

export default Ranking;
