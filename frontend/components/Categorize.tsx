import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FileText,
  AlertCircle,
  FolderOpen,
  Link2,
  X,
  ExternalLink,
  Eye
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import { aptosClient } from '@/utils/aptosClient';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

type CategoryType = 'personal identity' | 'legal' | 'education' | 'financial' | 'medical' | 'work' | 'other';

type StyleType = {
  bg: string;
  border: string;
  text: string;
  icon: string;
  hover: string;
};

interface Document {
  id: number;
  content_hash: string;
  creator: string;
  signers: string[];
  signatures: string[];
  is_completed: boolean;
  category?: CategoryType;
  extractedContent?: string;
}

interface CategoryGroup {
  [key: string]: Document[];
}

const STATUS_STYLES: Record<CategoryType, StyleType> = {
  'personal identity': {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    icon: 'text-purple-400',
    hover: 'hover:border-purple-500/50'
  },
  'legal': {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
    hover: 'hover:border-emerald-500/50'
  },
  'education': {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    icon: 'text-blue-400',
    hover: 'hover:border-blue-500/50'
  },
  'financial': {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    icon: 'text-yellow-400',
    hover: 'hover:border-yellow-500/50'
  },
  'medical': {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    icon: 'text-red-400',
    hover: 'hover:border-red-500/50'
  },
  'work': {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    icon: 'text-orange-400',
    hover: 'hover:border-orange-500/50'
  },
  'other': {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    text: 'text-gray-400',
    icon: 'text-gray-400',
    hover: 'hover:border-gray-500/50'
  }
};

export default function DocumentCategories() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categorizedDocs, setCategorizedDocs] = useState<CategoryGroup>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [genAI, setGenAI] = useState<any>(null);

  const API_KEY = "AIzaSyD4ZtMGRx91QQDUsDy0vLJHuIgo8XfL3WY";
  const moduleAddress = process.env.VITE_APP_MODULE_ADDRESS;
  const moduleName = process.env.VITE_APP_MODULE_NAME;
  const { account } = useWallet();

  useEffect(() => {
    const ai = new GoogleGenerativeAI(API_KEY);
    setGenAI(ai);
  }, []);

  useEffect(() => {
    if (genAI) {
      fetchAndCategorizeDocuments();
    }
  }, [genAI]);

  console.log(documents);

  const fetchAndCategorizeDocuments = async () => {
    setLoading(true);
    try {
      const response = await aptosClient().view<[Document[]]>({
        payload: {
          function: `${moduleAddress}::${moduleName}::get_all_documents`,
          typeArguments: [],
          functionArguments: [],
        }
      });

      if (Array.isArray(response) && response.length > 0 && account) {
        const userDocuments = response[0].filter((doc: Document) => doc.creator === account.address);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const categorizedResults: Document[] = [];

        for (const doc of userDocuments) {
          try {
            const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${doc.content_hash}`, {
              responseType: 'blob'
            });
            const blob = response.data;
            const fileType = blob.type;

            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
              reader.readAsDataURL(blob);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
            });
            const base64Content = base64Data.split(',')[1];

            let extractedContent = '';
            if (fileType.includes('image')) {
              const result = await model.generateContent({
                contents: [{
                  role: 'user',
                  parts: [
                    { text: "Describe this image comprehensively. Extract all visible text, identify key objects, and provide a detailed description." },
                    { inlineData: { mimeType: fileType, data: base64Content }}
                  ]
                }]
              });
              extractedContent = result.response.text();
            } else {
              const result = await model.generateContent({
                contents: [{
                  role: 'user',
                  parts: [
                    { text: "Extract and summarize the main text content. Provide a comprehensive overview including key information, topics, and any significant details." },
                    { inlineData: { mimeType: fileType, data: base64Content }}
                  ]
                }]
              });
              extractedContent = result.response.text();
            }

            const categoryPrompt = `
              Based on this document content, determine the appropriate category:

              ${extractedContent}

              Categories:
              - personal identity (for ID documents like Aadhaar, PAN card, passport)
              - legal (for contracts, agreements, legal notices)
              - education (for certificates, marksheets, academic documents)
              - financial (for bank statements, invoices, financial records)
              - medical (for health records, prescriptions, medical reports)
              - work (for employment documents, offer letters)
              - other (if none of the above clearly match)

              Respond with ONLY the category name in lowercase.
            `;

            const categoryResult = await model.generateContent(categoryPrompt);
            const category = categoryResult.response.text().trim().toLowerCase() as CategoryType;
            const validCategories: CategoryType[] = ['personal identity', 'legal', 'education', 'financial', 'medical', 'work', 'other'];

            categorizedResults.push({
              ...doc,
              category: validCategories.includes(category) ? category : 'other',
              extractedContent
            });

          } catch (error) {
            console.error(`Error processing document ${doc.id}:`, error);
            categorizedResults.push({ ...doc, category: 'other' });
          }
        }

        const grouped = categorizedResults.reduce((acc, doc) => {
          const category = doc.category || 'other';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(doc);
          return acc;
        }, {} as CategoryGroup);

        setDocuments(categorizedResults);
        setCategorizedDocs(grouped);
        localStorage.setItem('processedDocuments', JSON.stringify(categorizedResults));
      }
    } catch (error) {
      console.error("Error processing documents:", error);
      setError('Failed to process documents');
    } finally {
      setLoading(false);
    }
  };

  const openIPFSFile = async (cid: string) => {
    const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
    window.open(ipfsUrl, '_blank');
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      setSelectedDoc(doc);
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${doc.content_hash}`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setViewUrl(url);
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to load document");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 animate-pulse">Analyzing documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-gray-100 p-8">
      <Toaster />
      <h1 className="text-2xl font-bold mb-8 flex items-center space-x-3">
        <FolderOpen className="w-8 h-8 text-emerald-400" />
        <span>Document Categories</span>
      </h1>

      {error ? (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(categorizedDocs).map(([category, docs]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-semibold capitalize flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[category as CategoryType].bg}`} />
                <span>{category} Documents</span>
                <span className="text-sm text-gray-400">({docs.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => {
                  const styles = STATUS_STYLES[doc.category as CategoryType || 'other'];
                  return (
                    <div
                      key={doc.id}
                      className={`group relative bg-gray-800/50 backdrop-blur-sm rounded-xl border ${styles.border} hover:shadow-lg transition-all duration-200`}
                    >
                      <div className={`absolute top-0 left-4 right-0 h-2 ${styles.bg} rounded-b-lg`} />

                      <div className="p-4 md:p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-10 h-10 rounded-lg ${styles.bg} flex items-center justify-center`}>
                            <FileText className={`w-5 h-5 ${styles.icon}`} />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDocument(doc)}
                              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                              title="View Document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openIPFSFile(doc.content_hash)}
                              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                              title="Open in IPFS"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-medium">Document {doc.id}</h3>
                          <p className="text-sm text-gray-400">
                            {doc.signatures.length} of {doc.signers.length} signatures
                          </p>
                          <div className={`text-xs ${styles.text} flex items-center space-x-1`}>
                            <span className={`w-2 h-2 rounded-full ${doc.is_completed ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                            <span>{doc.is_completed ? 'Completed' : 'Pending'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDoc && viewUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg ${STATUS_STYLES[selectedDoc.category as CategoryType || 'other'].bg} flex items-center justify-center`}>
                  <FileText className={`w-4 h-4 ${STATUS_STYLES[selectedDoc.category as CategoryType || 'other'].icon}`} />
                </div>
                <div>
                  <h3 className="font-medium">Document {selectedDoc.id}</h3>
                  <p className="text-sm text-gray-400">
                    {selectedDoc.signatures.length} of {selectedDoc.signers.length} signatures
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openIPFSFile(selectedDoc.content_hash)}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  title="Open in IPFS"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedDoc(null);
                    setViewUrl(null);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <iframe
                src={viewUrl}
                className="w-full h-full rounded-lg border border-gray-800"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
