import React, { useState, useEffect } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { IoHome } from "react-icons/io5";
import {
  FileText,
  Check,
  X,
  Clock,
  ExternalLink,
  PenTool,
  Shield,
  Link2
} from 'lucide-react';

interface Signature {
  signer: string;
  timestamp: string;
}

interface Document {
  id: number;
  content_hash: string;
  creator: string;
  signers: string[];
  signatures: Signature[];
  is_completed: boolean;
}

const STATUS_STYLES = {
  completed: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
  },
  pending: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    icon: 'text-yellow-400',
  }
};

const SigningPage: React.FC = () => {
  const { account, signAndSubmitTransaction } = useWallet();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const moduleAddress = import.meta.env.VITE_APP_MODULE_ADDRESS;
  const moduleName = import.meta.env.VITE_APP_MODULE_NAME;

  useEffect(() => {
    if (id) {
      fetchDocument(Number(id));
    }
  }, [id]);

  // Add a helper function to format timestamps
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(Number(timestamp) / 1000); // Convert microseconds to milliseconds
    return date.toLocaleString(); // Or use more specific formatting like date.toLocaleString('en-US', options)
  };

  const fetchDocument = async (docId: number) => {
    setLoading(true);
    try {
      const response = await aptosClient().view<[Document]>({
        payload: {
          function: `${moduleAddress}::${moduleName}::get_document`,
          typeArguments: [],
          functionArguments: [docId],
        },
      });

      if (response && response.length > 0) {
        const fetchedDocument = response[0];
        setDocument(fetchedDocument);
        handleViewDocument(fetchedDocument.content_hash);
      } else {
        toast.error('Document not found');
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      toast.error('Failed to fetch the document');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (cid: string) => {
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const response = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const objectUrl = URL.createObjectURL(blob);
      setViewDocumentUrl(objectUrl);
    } catch (error) {
      console.error("Error fetching document:", error);
      toast.error("Failed to fetch the document");
    }
  };

  const openIPFSFile = async (cid: string) => {
    const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
    const response = await axios.get(ipfsUrl, { responseType: 'blob' });
    window.open(URL.createObjectURL(response.data), '_blank');
  };

  const handleSignDocument = async () => {
    if (!account || !document) return;
    setSigning(true);
    try {
      const payload: InputTransactionData = {
        data: {
          function: `${moduleAddress}::${moduleName}::sign_document`,
          functionArguments: [document.id],
        }
      };
      await signAndSubmitTransaction(payload);
      toast.custom((_t) => (
        <div className="bg-gray-800 text-white px-6 py-4 shadow-xl rounded-lg border border-gray-700 animate-in slide-in-from-bottom-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <p>Document signed successfully!</p>
          </div>
        </div>
      ));
      navigate('/');
    } catch (error) {
      console.error("Error signing document:", error);
      toast.error('Failed to sign the document');
    } finally {
      setSigning(false);
    }
  };

  const canSign = () => {
    if (!account || !document) return false;
    return document.signers.includes(account.address) &&
           !document.signatures.some(sig => sig.signer === account.address) &&
           !document.is_completed;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 animate-pulse">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center">
        <div className="text-center space-y-4 p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-200">Document Not Found</h2>
          <p className="text-gray-400">The requested document could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
          >
            <IoHome /> Return Home
          </button>
        </div>
      </div>
    );
  }

  const status = document.is_completed ? 'completed' : 'pending';
  const styles = STATUS_STYLES[status];

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-gray-100">
      <Toaster />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg ${styles.bg} flex items-center justify-center`}>
              <FileText className={`w-5 h-5 ${styles.icon}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Document #{document.id}</h1>
              <p className="text-sm text-gray-400">
                Sign and verify document details
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm self-start md:self-auto flex text-base"
          >
            <IoHome className='w-5 h-5 mx-2 ' /> Return to Dashboard
          </button>
        </div>

        {/* Document Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 space-y-2">
            <div className="flex items-center space-x-2 text-gray-400">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Status</span>
            </div>
            <div className={`flex items-center space-x-2 ${styles.text}`}>
              <span className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
              <span className="font-medium capitalize">{status}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 space-y-2">
            <div className="flex items-center space-x-2 text-gray-400">
              <PenTool className="w-4 h-4" />
              <span className="text-sm">Signatures</span>
            </div>
            <p className="font-medium">{document.signatures.length} of {document.signers.length}</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 space-y-2">
            <div className="flex items-center space-x-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Created by</span>
            </div>
            <p className="font-medium truncate">{document.creator}</p>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="relative rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 mb-6">
          <div className="absolute top-4 right-4 z-10 flex space-x-2">
            <button
              onClick={() => openIPFSFile(document.content_hash)}
              className="p-2 rounded-lg bg-gray-900/50 hover:bg-gray-700 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.open(`https://ipfs.io/ipfs/${document.content_hash}`, '_blank')}
              className="p-2 rounded-lg bg-gray-900/50 hover:bg-gray-700 transition-colors"
              title="View on IPFS"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>
          {viewDocumentUrl ? (
            <iframe
              src={viewDocumentUrl}
              className="w-full h-[60vh] rounded-xl"
              title="Document Viewer"
            />
          ) : (
            <div className="h-[60vh] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
            </div>
          )}
        </div>

        <ul className="space-y-2">
          {document.signers.map((signer, index) => {
            const signature = document.signatures.find(sig => sig.signer === signer);
            return (
              <li 
                key={index} 
                className="flex items-center justify-between p-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg"
              >
                <div className="flex flex-col">
                  <span className="truncate">{signer}</span>
                  {signature && (
                    <span className="text-xs text-gray-400">
                      Signed: {formatTimestamp(signature.timestamp)}
                    </span>
                  )}
                </div>
                {signature ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <X className="w-4 h-4 text-red-400" />
                )}
              </li>
            );
          })}
        </ul>
        {/* Sign Button */}
        {canSign() ? (
          <button
            onClick={handleSignDocument}
            disabled={signing}
            className="w-full md:w-auto my-2 px-8 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {signing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Signing...</span>
              </>
            ) : (
              <>
                  <PenTool className="w-4 h-4" />
                  <span className=''>Sign Document</span>
              </>
            )}
          </button>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-emerald-400 rounded-lg p-4 text-center my-2">
            <p className="text-gray-400">
              {document.is_completed
                ? 'This document has been fully signed by all parties.'
                : 'You are not authorized to sign this document.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SigningPage;
