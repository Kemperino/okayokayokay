'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import Image from 'next/image';

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [showModal, setShowModal] = useState(false);

  const handleConnect = (connector: any) => {
    connect({ connector });
    setShowModal(false);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-green-100 border border-green-200 rounded-lg">
          <div className="text-xs text-green-700 font-semibold mb-1">Connected Wallet</div>
          <code className="text-sm font-mono text-green-900">{address}</code>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
        <p className="text-sm text-gray-600 mb-6">
          Connect your wallet to view your merchant transactions and manage disputes
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Connect Wallet
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Choose Wallet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => handleConnect(connector)}
                  className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-3"
                >
                  {connector.icon && (
                    <Image src={connector.icon} alt={connector.name} width={32} height={32} className="w-8 h-8" />
                  )}
                  <span className="flex-1 text-left">{connector.name}</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
