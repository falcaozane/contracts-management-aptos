import { useState, useEffect } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import {WalletName}  from '@aptos-labs/wallet-adapter-react';
import { 
  Clock, 
  Grid,  
  Share2, 
  Trash2, 
  Upload, 
  MoreVertical,
  FileText, 
  X, 
  Menu,
  Eye,
  Bot,
  ExternalLink, 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import {IoDocumentLockOutline} from 'react-icons/io5'
 

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

interface Signer {
  address: string;
  label?: string;
}

const STATUS_STYLES = {
  completed: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
    hover: 'hover:border-emerald-500/50'
  },
  pending: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    icon: 'text-yellow-400',
    hover: 'hover:border-yellow-500/50'
  }
};

const ACTIVE_TAB_STYLES = "bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border-l-2 border-emerald-500 text-white";

export default function SharedDocs() {
  const { account, signAndSubmitTransaction, connect, disconnect } = useWallet(); 
  const [activeTab, setActiveTab] = useState('recent');
  const [isGridView, setIsGridView] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
//   const [dragActive, setDragActive] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [signersList, setSignersList] = useState<Signer[]>([{ address: '' }]);

  const moduleAddress = process.env.VITE_APP_MODULE_ADDRESS;
  const moduleName = process.env.VITE_APP_MODULE_NAME;

  console.log(pendingDocuments)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarCollapsed(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (account) {
      fetchUserDocuments();
      fetchPendingDocuments();
    }
  }, [account]);

  const fetchUserDocuments = async () => {
    if (!account) return;
    try {
      const response = await aptosClient().view<[Document[]]>({
        payload: {
          function: `${moduleAddress}::${moduleName}::get_all_documents`,
          typeArguments: [],
          functionArguments: [],
        }
      });


      if (Array.isArray(response) && response.length > 0 && account) {
        const userDocuments = response[0].filter(
          doc =>  doc.signers.includes(account.address)
        );
        console.log(userDocuments)
        setDocuments(userDocuments);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    }
  };

  const fetchPendingDocuments = async () => {
    if (!account) return;
    try {
      const response = await aptosClient().view<[Document[]]>({
        payload: {
          function: `${moduleAddress}::${moduleName}::get_all_documents`,
          typeArguments: [],
          functionArguments: [],
        }
      });

      if (Array.isArray(response) && response.length > 0 && account) {
        const pendingDocs = response[0].filter(doc => 
          doc.signers.includes(account.address) && 
          !doc.signatures.some(sig => sig.signer === account.address) &&
          !doc.is_completed
        );
        setPendingDocuments(pendingDocs);
      } else {
        setPendingDocuments([]);
      }
    } catch (error) {
      console.error("Error fetching pending documents:", error);
    }
  };

  const fetchDocumentContent = async (cid: string) => {
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const response = await axios.get(url, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      console.error("Error fetching document content:", error);
      return null;
    }
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      setViewingDoc(doc);
      const content = await fetchDocumentContent(doc.content_hash);
      if (content) {
        setViewUrl(URL.createObjectURL(content));
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to load document");
    }
  };

  const uploadToPinata = async (file: File) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    let formData = new FormData();
    formData.append('file', file);
    
    const metadata = JSON.stringify({
      name: 'Document File',
    });
    formData.append('pinataMetadata', metadata);
    
    try {
      const res = await axios.post(url, formData, {
        headers: {
          'pinata_api_key': process.env.VITE_APP_PINATA_API_KEY,
          'pinata_secret_api_key': process.env.VITE_APP_PINATA_SECRET_API_KEY,
          "Content-Type": "multipart/form-data"
        },
      });
      return res.data.IpfsHash;
    } catch (error) {
      console.error("Error uploading to Pinata:", error);
      throw error;
    }
  };

  const handleCreateDocument = async () => {
    if (!account || !file || signersList.every(s => !s.address.trim())) return;
    setLoading(true);
    try {
      const cid = await uploadToPinata(file);
      const signerAddresses = signersList
        .filter(signer => signer.address.trim() !== '')
        .map(signer => signer.address.trim());

      const payload: InputTransactionData = {
        data: {
          function: `${moduleAddress}::${moduleName}::create_document`,
          functionArguments: [cid, signerAddresses],
        }
      };
      await signAndSubmitTransaction(payload);
      setIsModalOpen(false);
      setFile(null);
      setSignersList([{ address: '' }]);
      fetchUserDocuments();
      toast.custom((_t) => (
        <div className="bg-gray-800 text-white px-6 py-4 shadow-xl rounded-lg border border-gray-700 animate-in slide-in-from-bottom-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <p>Document uploaded successfully</p>
          </div>
        </div>
      ));
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error("Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (docId: number) => {
    const signingLink = `${window.location.origin}/sign/${docId}`;
    navigator.clipboard.writeText(signingLink);
    toast.custom((t) => (
      <div className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex items-center justify-between p-4 gap-3 border border-gray-700`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
            <Share2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-gray-100">
            Signing link copied to clipboard
          </p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="p-2 rounded-lg hover:bg-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ), {
      duration: 2000,
      position: 'bottom-right',
    });
  };

//   const handleDrag = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave") {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);
    
//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       setFile(e.dataTransfer.files[0]);
//       setIsModalOpen(true);
//     }
//   };

  const openIPFSFile = async(cid: string) => {
    const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
    const response = await axios.get(ipfsUrl, { responseType: 'blob' });
    window.open(URL.createObjectURL(response.data), '_blank');
  };

  const DocumentCard = ({ doc }: { doc: Document }) => {
    const status = doc.is_completed ? 'completed' : 'pending';
    const styles = STATUS_STYLES[status];
    
    return (
      <div 
        className={`group relative bg-gray-800/50 backdrop-blur-sm rounded-xl border ${styles.border} ${styles.hover} transition-all duration-200`}
      >
        <div className={`absolute top-0 left-4 right-0 h-2 ${styles.bg} rounded-b-lg`}></div>
        
        <Link to={`/sign/${doc.id}`}>
          <div className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${styles.bg} flex items-center justify-center`}>
                <FileText className={`w-5 h-5 ${styles.icon}`} />
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleViewDocument(doc);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleShare(doc.id);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Document {doc.id}</h4>
              <p className="text-sm text-gray-400">
                {doc.signatures.length} of {doc.signers.length} signatures
              </p>
              <div className={`text-xs ${styles.text} flex items-center space-x-1`}>
                <span className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></span>
                <span>{status === 'completed' ? 'Completed' : 'Pending'}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-[#1A1B1E] text-gray-100">
      <Toaster />
      {/* Main Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`${
            isMobile ? 'fixed' : 'relative'
          } z-20 transition-all duration-300 flex flex-col ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          } h-full border-r border-gray-800 bg-[#1A1B1E]`}
        >
          {/* Navigation */}
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed && <h2 className="text-2xl font-bold flex items-center"><IoDocumentLockOutline className='h-7 w-7 mx-2' />Decrypt Docs</h2>}
              {isMobile && (
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-2 rounded-lg hover:bg-gray-800"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {[
              { id: 'Home', icon: <Clock className="w-4 h-4" />, label: 'Home',path: '/' },
              { id: 'Categorized', icon: <Grid className="w-4 h-4" />, label: 'Categorized', path: '/categorize' },
              { id: 'Shared', icon: <Share2 className="w-4 h-4" />, label: 'Shared' },
              { id: 'Trash', icon: <Trash2 className="w-4 h-4" />, label: 'Trash' },
              { id: 'bot', icon: <Bot className="w-4 h-4" />, label: 'Talk-2-Docs', path: '/chatwithdocs' }
            ].map((item) => (
              <Link key={item.id} to={item.path || '#'}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full rounded-lg transition-all duration-200 flex items-center ${
                    isSidebarCollapsed 
                      ? 'justify-center p-3' 
                      : 'px-4 py-2 space-x-3'
                  } ${
                    activeTab === item.id 
                      ? ACTIVE_TAB_STYLES
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.icon}
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              </Link>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto p-4 border-t border-gray-800 space-y-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`w-full bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-2 ${
                isSidebarCollapsed ? 'p-3' : 'px-4 py-3'
              }`}
            >
              <Upload className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Upload</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-20 md:ml-0 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#1A1B1E] border-b border-gray-800">
            <div className="px-4 md:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs md:text-sm">Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs md:text-sm">Pending</span>
                </div>
              </div>
              {!account ? (
                <button 
                  onClick={() => connect("Petra" as WalletName<"Petra">)}
                  className="px-4 md:px-6 py-2 text-sm md:text-base rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors"
                >
                  Connect
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button className="hidden md:inline text-sm text-white bg-emerald-500 hover:bg-emerald-600">
                    {`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                  </Button>
                  <button
                    onClick={() => disconnect()}
                    className="p-2 rounded-lg hover:bg-gray-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 md:p-6 space-y-6">
            {/* Statistics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Signed Documents */}
              <div className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">Signed Documents</h3>
                    <p className="text-sm text-gray-400">Successfully completed</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <div className="h-24 flex items-end">
                      <div 
                        className="flex-1 bg-emerald-500/20 rounded-t-lg transition-all duration-500" 
                        style={{ 
                          height: documents.length ? 
                            `${(documents.filter(doc => doc.is_completed).length / documents.length) * 100}%` :
                            '0%',
                          minHeight: '10%'
                        }}
                      />
                    </div>
                    <div className="h-1 w-full bg-emerald-500/20 mt-2" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {documents.filter(doc => doc.is_completed).length}
                  </div>
                </div>
              </div>

              {/* Pending Documents */}
              <div className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">Pending Documents</h3>
                    <p className="text-sm text-gray-400">Awaiting signatures</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <div className="h-24 flex items-end">
                      <div 
                        className="flex-1 bg-yellow-500/20 rounded-t-lg transition-all duration-500" 
                        style={{ 
                          height: documents.length ? 
                            `${(documents.filter(doc => !doc.is_completed).length / documents.length) * 100}%` :
                            '0%',
                          minHeight: '10%'
                        }}
                      />
                    </div>
                    <div className="h-1 w-full bg-yellow-500/20 mt-2" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {documents.filter(doc => !doc.is_completed).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Your Documents</h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setIsGridView(true)}
                    className={`p-2 rounded-lg ${isGridView ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsGridView(false)}
                    className={`p-2 rounded-lg ${!isGridView ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className={`grid gap-4 ${
                isGridView 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/* Enhanced Upload Modal */}
    {isModalOpen && (
            <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
            >
            <div 
                className="bg-gray-900 rounded-xl w-full max-w-md animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="border-b border-gray-800">
                <div className="flex justify-between items-center p-6">
                    <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold">Upload Document</h3>
                    </div>
                    <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors group"
                    >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
                </div>
                
                <div className="p-6 space-y-6">
                {/* File Upload Section */}
                <div 
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 
                    ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'}`}
                >
                    {file ? (
                    <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-gray-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <button 
                        onClick={() => setFile(null)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                        >
                        Remove file
                        </button>
                    </div>
                    ) : (
                    <div
                        onClick={() => document.getElementById('modal-file-input')?.click()}
                        className="cursor-pointer space-y-2"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-400">Drop your file here or click to browse</p>
                        <p className="text-xs text-gray-500">Maximum file size: 25MB</p>
                    </div>
                    )}
                    <input
                    id="modal-file-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile && selectedFile.size <= 25 * 1024 * 1024) {
                        setFile(selectedFile);
                        } else {
                        toast.error("File size must be less than 25MB");
                        }
                    }}
                    />
                </div>

                {/* Signers Section */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">Signers</label>
                    <div className="space-y-2">
                    {signersList.map((signer, index) => (
                        <div 
                        key={index}
                        className="group flex items-center space-x-2 animate-in slide-in-from-left duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                        >
                        <input
                            type="text"
                            value={signer.address}
                            onChange={(e) => {
                            const newList = [...signersList];
                            newList[index].address = e.target.value;
                            setSignersList(newList);
                            }}
                            placeholder="Enter signer address"
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none transition-colors text-sm"
                        />
                        {signersList.length > 1 && (
                            <button
                            onClick={() => {
                                const newList = signersList.filter((_, i) => i !== index);
                                setSignersList(newList);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                            <X className="w-4 h-4" />
                            </button>
                        )}
                        </div>
                    ))}
                    </div>
                    <button
                    onClick={() => setSignersList([...signersList, { address: '' }])}
                    className="w-full px-4 py-2 rounded-lg border border-dashed border-gray-700 hover:border-emerald-500 text-gray-400 hover:text-emerald-400 transition-all text-sm focus:outline-none"
                    >
                    + Add another signer
                    </button>
                </div>
                </div>

            {/* Actions */}
            <div className="border-t border-gray-800 p-6">
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDocument}
                  disabled={loading || !file || signersList.every(s => !s.address.trim())}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg ${STATUS_STYLES[viewingDoc.is_completed ? 'completed' : 'pending'].bg} flex items-center justify-center`}>
                  <FileText className={`w-4 h-4 ${STATUS_STYLES[viewingDoc.is_completed ? 'completed' : 'pending'].icon}`} />
                </div>
                <div>
                  <h3 className="font-medium">Document {viewingDoc.id}</h3>
                  <p className="text-sm text-gray-400">
                    {viewingDoc.signatures.length} of {viewingDoc.signers.length} signatures
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openIPFSFile(viewingDoc.content_hash)}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setViewingDoc(null);
                    setViewUrl(null);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4">
              {viewUrl ? (
                <iframe
                  src={viewUrl}
                  className="w-full h-full rounded-lg border border-gray-800"
                  title="Document Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading document...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && !isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-10"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};
 