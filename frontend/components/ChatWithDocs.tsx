// import React, { useState, useEffect, useRef } from 'react';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { 
//   Upload,
//   MessageSquare, 
//   Send, 
//   AlertCircle,
//   Loader,
//   Bot,
//   User,
//   X,
//   FileText,
//   Trash2,
//   Info
// } from 'lucide-react';


// interface FileMetadata {
//   id: string;
//   name: string;
//   type: 'image' | 'pdf';
//   category: string;
//   description: string;
//   uploadedAt: string;
//   processingStatus: 'pending' | 'success' | 'error';
// }

// interface ChatMessage {
//   id: string;
//   role: 'user' | 'ai';
//   content: string;
// }

// const STATUS_STYLES = {
//   success: {
//     bg: 'bg-emerald-500/10',
//     border: 'border-emerald-500/20',
//     text: 'text-emerald-400',
//     icon: 'text-emerald-400',
//   },
//   error: {
//     bg: 'bg-red-500/10',
//     border: 'border-red-500/20',
//     text: 'text-red-400',
//     icon: 'text-red-400',
//   },
//   pending: {
//     bg: 'bg-yellow-500/10',
//     border: 'border-yellow-500/20',
//     text: 'text-yellow-400',
//     icon: 'text-yellow-400',
//   }
// };

// export default function DocumentManager() {
//   const [files, setFiles] = useState<File[]>([]);
//   const [error, setError] = useState<string>('');
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [fileMetadata, setFileMetadata] = useState<FileMetadata[]>([]);
//   const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
//   const [userInput, setUserInput] = useState<string>('');
//   const [isSending, setIsSending] = useState(false);
//   const [dragActive, setDragActive] = useState(false);
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const API_KEY = "AIzaSyD6olpfeXKuZiACMF5awOE_HxOI4ifOlZM" || "";
//   const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf'];

//   useEffect(() => {
//     loadExistingMetadata();
//   }, []);

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [chatMessages]);

//   const loadExistingMetadata = () => {
//     try {
//       const storedMetadata = localStorage.getItem('documentMetadata');
//       if (storedMetadata) {
//         setFileMetadata(JSON.parse(storedMetadata));
//       }
//     } catch (err) {
//       console.error('Error loading metadata:', err);
//     }
//   };

//   const saveMetadata = (newMetadata: FileMetadata[]) => {
//     setFileMetadata(newMetadata);
//     localStorage.setItem('documentMetadata', JSON.stringify(newMetadata));
//   };

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
    
//     const droppedFiles = Array.from(e.dataTransfer.files);
//     handleFiles(droppedFiles);
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const selectedFiles = Array.from(e.target.files || []);
//     handleFiles(selectedFiles);
//   };

//   const handleFiles = (selectedFiles: File[]) => {
//     const validFiles: File[] = [];
//     const invalidFiles: string[] = [];

//     selectedFiles.forEach(file => {
//       const fileExtension = file.name.split('.').pop()?.toLowerCase();
//       if (fileExtension && ALLOWED_EXTENSIONS.includes(fileExtension)) {
//         validFiles.push(file);
//       } else {
//         invalidFiles.push(file.name);
//       }
//     });

//     setFiles(validFiles);

//     if (invalidFiles.length > 0) {
//       setError(`Invalid file types for: ${invalidFiles.join(', ')}. Only PNG, JPG, and PDF are allowed.`);
//     } else {
//       setError('');
//     }
//   };

//   const determineCategory = async (content: string, model: any): Promise<string> => {
//     try {
//       const categoryPrompt = `Based on the following text, determine the most appropriate document category. 
//       Categories include: education, personal identity, legal, financial, medical, work, other.
      
//       Text: ${content}
      
//       Respond with ONLY the category name in lowercase.`;

//       const categoryResult = await model.generateContent(categoryPrompt);
//       const category = categoryResult.response.text().trim().toLowerCase();

//       const validCategories = ['education', 'personal identity', 'legal', 'financial', 'medical', 'work', 'other'];
//       return validCategories.includes(category) ? category : 'other';
//     } catch (err) {
//       console.error('Category determination error:', err);
//       return 'other';
//     }
//   };

//   const processFile = async (file: File, model: any): Promise<FileMetadata> => {
//     try {
//       const reader = new FileReader();
//       const base64Data = await new Promise<string>((resolve, reject) => {
//         reader.readAsDataURL(file);
//         reader.onload = () => resolve(reader.result as string);
//         reader.onerror = reject;
//       });

//       const base64Image = base64Data.split(',')[1];
//       const fileExtension = file.name.split('.').pop()?.toLowerCase();

//       let extractedContent = '';

//       if (['png', 'jpg', 'jpeg'].includes(fileExtension || '')) {
//         const result = await model.generateContent({
//           contents: [{
//             role: 'user',
//             parts: [
//               { text: "Describe this image comprehensively. Extract all visible text, identify key objects, and provide a detailed description." },
//               { inlineData: { mimeType: file.type, data: base64Image }}
//             ]
//           }]
//         });
//         extractedContent = result.response.text();
//       } else if (fileExtension === 'pdf') {
//         const result = await model.generateContent({
//           contents: [{
//             role: 'user',
//             parts: [
//               { text: "Extract and summarize the main text content from this PDF. Provide a comprehensive overview including key information, topics, and any significant details." },
//               { inlineData: { mimeType: file.type, data: base64Image }}
//             ]
//           }]
//         });
//         extractedContent = result.response.text();
//       }

//       const category = await determineCategory(extractedContent, model);

//       return {
//         id: `${Date.now()}-${file.name}`,
//         name: file.name,
//         type: fileExtension === 'pdf' ? 'pdf' : 'image',
//         category,
//         description: extractedContent,
//         uploadedAt: new Date().toISOString(),
//         processingStatus: 'success'
//       };
//     } catch (err) {
//       console.error(`Failed to process file ${file.name}:`, err);
//       return {
//         id: `${Date.now()}-${file.name}`,
//         name: file.name,
//         type: file.name.endsWith('.pdf') ? 'pdf' : 'image',
//         category: 'other',
//         description: `Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
//         uploadedAt: new Date().toISOString(),
//         processingStatus: 'error'
//       };
//     }
//   };
// const processFiles = async () => {
//     if (files.length === 0) {
//       setError('No files selected');
//       return;
//     }

//     setIsLoading(true);
//     setError('');

//     try {
//       const genAI = new GoogleGenerativeAI(API_KEY);
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//       const processedMetadata = await Promise.all(
//         files.map(file => processFile(file, model))
//       );

//       saveMetadata([...fileMetadata, ...processedMetadata]);
//       setFiles([]);
//     } catch (err) {
//       setError(`Failed to process files: ${err instanceof Error ? err.message : 'Unknown error'}`);
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleChat = async () => {
//     if (!userInput.trim()) return;
//     setIsSending(true);

//     const userMessage: ChatMessage = {
//       id: `user-${Date.now()}`,
//       role: 'user',
//       content: userInput
//     };
//     setChatMessages(prev => [...prev, userMessage]);

//     try {
//       const genAI = new GoogleGenerativeAI(API_KEY);
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//       const context = fileMetadata.map(file =>
//         `File: ${file.name}, Type: ${file.type}, Category: ${file.category}, Description: ${file.description}`
//       ).join('\n');

//       const chatResult = await model.generateContent(
//         `Context of uploaded files:\n${context}\n\n` +
//         `User query: ${userInput}\n\n` +
//         `Based on the context of uploaded files, provide a relevant and helpful response.`
//       );

//       const aiMessage: ChatMessage = {
//         id: `ai-${Date.now()}`,
//         role: 'ai',
//         content: chatResult.response.text()
//       };

//       setChatMessages(prev => [...prev, aiMessage]);
//       setUserInput('');
//     } catch (err) {
//       console.error('Chat error:', err);
//       const errorMessage: ChatMessage = {
//         id: `error-${Date.now()}`,
//         role: 'ai',
//         content: 'Sorry, there was an error processing your request.'
//       };
//       setChatMessages(prev => [...prev, errorMessage]);
//     } finally {
//       setIsSending(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#1A1B1E] text-gray-100">
//         <title>AI Document Assistant</title>
//       <div className="flex h-screen">
//         {/* Upload Section */}
//         <div className="w-1/3 border-r border-gray-800 flex flex-col">
//           <div className="p-6 border-b border-gray-800">
//             <h2 className="text-xl font-semibold flex items-center space-x-2">
//               <Upload className="w-5 h-5 text-emerald-400" />
//               <span>Document Upload</span>
//             </h2>
//           </div>

//           <div className="p-6 space-y-4 flex-1 overflow-y-auto">
//             {/* Upload Area */}
//             <div 
//               className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
//                 ${dragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 hover:border-gray-600'}`}
//               onDragEnter={handleDrag}
//               onDragLeave={handleDrag}
//               onDragOver={handleDrag}
//               onDrop={handleDrop}
//             >
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 multiple
//                 accept=".png,.jpg,.jpeg,.pdf"
//                 onChange={handleFileChange}
//                 className="hidden"
//               />
              
//               <div className="space-y-4">
//                 <div className="w-12 h-12 rounded-full bg-gray-800 mx-auto flex items-center justify-center">
//                   <Upload className="w-6 h-6 text-gray-400" />
//                 </div>
//                 <div>
//                   <p className="text-gray-400">Drag and drop your files here or</p>
//                   <button 
//                     onClick={() => fileInputRef.current?.click()}
//                     className="text-emerald-400 hover:text-emerald-300 transition-colors"
//                   >
//                     browse
//                   </button>
//                 </div>
//                 <p className="text-xs text-gray-500">Supported: PNG, JPG, PDF (max 10MB)</p>
//               </div>
//             </div>

//             {/* Selected Files */}
//             {files.length > 0 && (
//               <div className="space-y-2">
//                 <h3 className="text-sm font-medium text-gray-400">Selected Files</h3>
//                 {files.map(file => (
//                   <div key={file.name} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-between">
//                     <div className="flex items-center space-x-2">
//                       <FileText className="w-4 h-4 text-emerald-400" />
//                       <span className="text-sm truncate">{file.name}</span>
//                     </div>
//                     <button 
//                       onClick={() => setFiles(files.filter(f => f !== file))}
//                       className="p-1 hover:bg-gray-700 rounded transition-colors"
//                     >
//                       <X className="w-4 h-4" />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {error && (
//               <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-2">
//                 <AlertCircle className="w-4 h-4 text-red-400" />
//                 <p className="text-sm text-red-400">{error}</p>
//               </div>
//             )}

//             <button 
//               onClick={processFiles}
//               disabled={isLoading || files.length === 0}
//               className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
//             >
//               {isLoading ? (
//                 <>
//                   <Loader className="w-4 h-4 animate-spin" />
//                   <span>Processing...</span>
//                 </>
//               ) : (
//                 <>
//                   <Upload className="w-4 h-4" />
//                   <span>Process Files</span>
//                 </>
//               )}
//             </button>
//           </div>

//           {/* Processed Files */}
//           {fileMetadata.length > 0 && (
//             <div className="p-6 border-t border-gray-800">
//               <h3 className="text-sm font-medium text-gray-400 mb-3">Processed Files</h3>
//               <div className="space-y-2 max-h-48 overflow-y-auto">
//                 {fileMetadata.map(file => {
//                   const status = STATUS_STYLES[file.processingStatus];
//                   return (
//                     <div 
//                       key={file.id} 
//                       className={`p-3 rounded-lg ${status.bg} border ${status.border} flex items-center justify-between`}
//                     >
//                       <div className="flex items-center space-x-2">
//                         <FileText className={status.icon} />
//                         <span className="text-sm truncate">{file.name}</span>
//                       </div>
//                       <span className={`text-xs ${status.text} capitalize`}>{file.category}</span>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Chat Section */}
//         <div className="flex-1 flex flex-col">
//           <div className="p-6 border-b border-gray-800">
//             <h2 className="text-xl font-semibold flex items-center space-x-2">
//               <MessageSquare className="w-5 h-5 text-emerald-400" />
//               <span>AI Assistant</span>
//             </h2>
//           </div>

//           {/* Messages */}
//           <div className="flex-1 p-6 space-y-4 overflow-y-auto">
//             {chatMessages.length === 0 ? (
//               <div className="text-center text-gray-400 mt-8 space-y-4">
//                 <Bot className="w-12 h-12 mx-auto text-gray-500" />
//                 <p>No messages yet. Start by uploading documents and asking questions!</p>
//               </div>
//             ) : (
//               chatMessages.map(msg => (
//                 <div
//                   key={msg.id}
//                   className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
//                 >
//                   <div className={`max-w-[80%] rounded-lg p-4 flex space-x-3
//                     ${msg.role === 'user' 
//                       ? 'bg-emerald-500/10 border border-emerald-500/20' 
//                       : 'bg-gray-800/50 border border-gray-700'
//                     }`}
//                   >
//                     {msg.role === 'ai' ? (
//                       <Bot className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
//                     ) : (
//                       <User className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
//                     )}
//                     <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
//                   </div>
//                 </div>
//               ))
//             )}
//             <div ref={chatEndRef} />
//           </div>

//           {/* Input */}
//           <div className="p-4 border-t border-gray-800">
//             <form 
//               onSubmit={(e) => {
//                 e.preventDefault();
//                 handleChat();
//               }}
//               className="flex space-x-2"
//             >
//               <input
//                 type="text"
//                 value={userInput}
//                 onChange={e => setUserInput(e.target.value)}
//                 placeholder="Ask about your documents..."
//                 className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none transition-colors"
//               />
//               <button
//                 type="submit"
//                 disabled={isSending || !userInput.trim()}
//                 className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
//               >
//                 {isSending ? (
//                   <Loader className="w-4 h-4 animate-spin" />
//                 ) : (
//                   <Send className="w-4 h-4" />
//                 )}
//               </button>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// import React, { useState, useEffect, useRef } from 'react';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { aptosClient } from "@/utils/aptosClient";
// import { 
//   MessageSquare, 
//   Send, 
//   Bot,
//   User,
//   Loader,
//   FileText
// } from 'lucide-react';
// import axios from 'axios';

// interface Document {
//   id: number;
//   content_hash: string;
//   creator: string;
//   signers: string[];
//   signatures: string[];
//   is_completed: boolean;
//   category?: string;
// }

// interface ChatMessage {
//   id: string;
//   role: 'user' | 'ai';
//   content: string;
// }

// export default function DocumentChat() {
//   const [documents, setDocuments] = useState<Document[]>([]);
//   const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
//   const [userInput, setUserInput] = useState('');
//   const [isSending, setIsSending] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const chatEndRef = useRef<HTMLDivElement>(null);

//   const moduleAddress = import.meta.env.VITE_APP_MODULE_ADDRESS;
//   const moduleName = import.meta.env.VITE_APP_MODULE_NAME;

//   const API_KEY = "AIzaSyD6olpfeXKuZiACMF5awOE_HxOI4ifOlZM";
  
//   useEffect(() => {
//     fetchDocuments();
//   }, []);

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [chatMessages]);

//   const fetchDocuments = async () => {
//     setIsLoading(true);
//     try {
//       const response = await aptosClient().view<[Document]>({
//         payload: {
//           function: `${moduleAddress}::${moduleName}::get_all_documents`,
//           typeArguments: [],
//           functionArguments: [],
//         }
//       });

//       if (Array.isArray(response) && response.length > 0) {
//         // Fetch content for each document
//         const docsWithContent = await Promise.all(
//           response[0].map(async (doc:any) => {
//             const content = await fetchDocumentContent(doc.content_hash);
//             return { ...doc, content };
//           })
//         );
//         setDocuments(docsWithContent);
//       }
//     } catch (error) {
//       console.error("Error fetching documents:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchDocumentContent = async (cid: string) => {
//     try {
//       const url = `https://ipfs.io/ipfs/${cid}`;
//       const response = await axios.get(url, { responseType: 'blob' });
//       const text = await response.data.text();
//       return text;
//     } catch (error) {
//       console.error("Error fetching document content:", error);
//       return '';
//     }
//   };

//   const handleChat = async () => {
//     if (!userInput.trim()) return;
//     setIsSending(true);

//     const userMessage: ChatMessage = {
//       id: `user-${Date.now()}`,
//       role: 'user',
//       content: userInput
//     };
//     setChatMessages(prev => [...prev, userMessage]);
//     setUserInput('');

//     try {
//       const genAI = new GoogleGenerativeAI(API_KEY);
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//       const context = documents.map(doc => 
//         `Document ID: ${doc.id}
//          Content Hash: ${doc.content_hash}
//          Category: ${doc.category || 'Uncategorized'}
//          Status: ${doc.is_completed ? 'Completed' : 'Pending'}
//          Signatures: ${doc.signatures.length} of ${doc.signers.length}`
//       ).join('\n\n');

//       const prompt = `You are a helpful AI assistant with access to the following documents:

//       ${context}

//       Based on the above documents, please provide a detailed and accurate response to this query:
//       ${userInput}

//       If the query is about specific documents, reference them by their IDs and provide relevant details.
//       If you can't find relevant information in the documents, please say so.`;

//       const chatResult = await model.generateContent(prompt);
      
//       const aiMessage: ChatMessage = {
//         id: `ai-${Date.now()}`,
//         role: 'ai',
//         content: chatResult.response.text()
//       };

//       setChatMessages(prev => [...prev, aiMessage]);
//     } catch (err) {
//       console.error('Chat error:', err);
//       const errorMessage: ChatMessage = {
//         id: `error-${Date.now()}`,
//         role: 'ai',
//         content: 'Sorry, I encountered an error while processing your request. Please try again.'
//       };
//       setChatMessages(prev => [...prev, errorMessage]);
//     } finally {
//       setIsSending(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center">
//         <div className="space-y-4 text-center">
//           <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
//           <p className="text-gray-400 animate-pulse">Loading documents...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#1A1B1E] text-gray-100 flex flex-col">
//       {/* Header */}
//       <div className="border-b border-gray-800 p-6">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center space-x-3">
//             <MessageSquare className="w-6 h-6 text-emerald-400" />
//             <h1 className="text-2xl font-bold">Document Assistant</h1>
//           </div>
//           <div className="text-sm text-gray-400">
//             {documents.length} documents loaded
//           </div>
//         </div>
//       </div>

//       {/* Chat Area */}
//       <div className="flex-1 overflow-y-auto p-6 space-y-4">
//         {chatMessages.length === 0 ? (
//           <div className="text-center text-gray-400 mt-12 space-y-4">
//             <Bot className="w-16 h-16 mx-auto text-emerald-400/50" />
//             <div className="space-y-2">
//               <p className="font-medium">No messages yet</p>
//               <p className="text-sm">Ask me anything about your documents!</p>
//             </div>
//           </div>
//         ) : (
//           chatMessages.map(msg => (
//             <div
//               key={msg.id}
//               className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
//             >
//               <div className={`max-w-[80%] rounded-lg p-4 flex space-x-3
//                 ${msg.role === 'user' 
//                   ? 'bg-emerald-500/10 border border-emerald-500/20' 
//                   : 'bg-gray-800/50 border border-gray-700'
//                 }`}
//               >
//                 {msg.role === 'ai' ? (
//                   <Bot className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
//                 ) : (
//                   <User className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
//                 )}
//                 <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
//               </div>
//             </div>
//           ))
//         )}
//         <div ref={chatEndRef} />
//       </div>

//       {/* Input Area */}
//       <div className="border-t border-gray-800 p-4">
//         <form 
//           onSubmit={(e) => {
//             e.preventDefault();
//             handleChat();
//           }}
//           className="flex space-x-2"
//         >
//           <input
//             type="text"
//             value={userInput}
//             onChange={(e) => setUserInput(e.target.value)}
//             placeholder="Ask about your documents..."
//             className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none transition-colors"
//           />
//           <button
//             type="submit"
//             disabled={isSending || !userInput.trim()}
//             className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
//           >
//             {isSending ? (
//               <Loader className="w-4 h-4 animate-spin" />
//             ) : (
//               <Send className="w-4 h-4" />
//             )}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { aptosClient } from "@/utils/aptosClient";
import { 
  MessageSquare, 
  Send, 
  Bot,
  User,
  Loader,
} from 'lucide-react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import "@/index.css"
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface Document {
  id: number;
  content_hash: string;
  creator: string;
  signers: string[];
  signatures: string[];
  is_completed: boolean;
  category?: string;
  extractedContent?: string;
  signerDetails?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

interface ProcessedDocument {
  id: number;
  summary: string;
  signerInfo: string;
  category: string;
  status: string;
}

export default function DocumentChat() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [processedDocs, setProcessedDocs] = useState<ProcessedDocument[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [genAI, setGenAI] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { account } = useWallet();

  const moduleAddress = import.meta.env.VITE_APP_MODULE_ADDRESS;
  const moduleName = import.meta.env.VITE_APP_MODULE_NAME;
  const API_KEY = "AIzaSyD6olpfeXKuZiACMF5awOE_HxOI4ifOlZM";

  // Initialize Gemini AI
  useEffect(() => {
    const ai = new GoogleGenerativeAI(API_KEY);
    setGenAI(ai);
  }, []);
  
  useEffect(() => {
    if (genAI) {
      fetchAndProcessDocuments();
    }
  }, [genAI]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const analyzeDocument = async (content: string | Blob, model: any): Promise<string> => {
    try {
      let textContent = '';
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.readAsDataURL(content as Blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const base64Content = base64Data.split(',')[1];
      const fileType = (content as Blob).type;

      if (fileType.includes('image')) {
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: "Analyze this image and provide a detailed summary of its content, including any visible text, key information, and important details." },
              { inlineData: { mimeType: fileType, data: base64Content }}
            ]
          }]
        });
        textContent = result.response.text();
      } else {
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: "Provide a comprehensive summary of this document's content, highlighting key points, important details, and any significant information." },
              { inlineData: { mimeType: fileType, data: base64Content }}
            ]
          }]
        });
        textContent = result.response.text();
      }
      return textContent;
    } catch (error) {
      console.error('Error analyzing document:', error);
      return 'Error analyzing document content';
    }
  };

  

  const fetchAndProcessDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await aptosClient().view<[Document[]]>({
        payload: {
          function: `${moduleAddress}::${moduleName}::get_all_documents`,
          typeArguments: [],
          functionArguments: [],
        }
      });
  
      if (Array.isArray(response) && response.length > 0 && account) {
        // Filter documents created by the connected account
        const userDocuments = response[0].filter(doc => doc.creator === account.address);
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const processedDocuments: ProcessedDocument[] = [];
  
        for (const doc of userDocuments) {  // Process only user's documents
          try {
            // Fetch and analyze document content
            const content = await axios.get(`https://gateway.pinata.cloud/ipfs/${doc.content_hash}`, {
              responseType: 'blob'
            });
            
            const summary = await analyzeDocument(content.data, model);
            
            // Get signer information
            const signerInfo = `Signers: ${doc.signers.join(', ')}\nSignatures Completed: ${doc.signatures.length}/${doc.signers.length}`;
            
            processedDocuments.push({
              id: doc.id,
              summary,
              signerInfo,
              category: doc.category || 'uncategorized',
              status: doc.is_completed ? 'completed' : 'pending'
            });
          } catch (error) {
            console.error(`Error processing document ${doc.id}:`, error);
          }
        }
  
        setProcessedDocs(processedDocuments);
        setDocuments(userDocuments);  // Store only user's documents
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChat = async () => {
    if (!userInput.trim()) return;
    setIsSending(true);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput
    };
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Create detailed context with document summaries and signer info
      const context = processedDocs.map(doc => 
        `Document ID: ${doc.id}
         Summary: ${doc.summary}
         ${doc.signerInfo}
         Category: ${doc.category}
         Status: ${doc.status}`
      ).join('\n\n==========\n\n');

      const prompt = `You are an AI assistant with detailed knowledge of these documents:

      ${context}

      User Query: "${userInput}"

      Instructions for response:
      1. If the query is about specific documents, reference them by ID and provide relevant details
      2. Include relevant signer information when discussing document status
      3. If the query relates to multiple documents, compare and contrast them
      4. If you can't find relevant information, clearly state that
      5. Be specific and cite document IDs when providing information

      Please provide a detailed and accurate response:`;

      const chatResult = await model.generateContent(prompt);
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: chatResult.response.text()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 animate-pulse">Loading and analyzing documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-gray-100 flex flex-col">
      <Toaster />
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold">Document Assistant</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {documents.length} documents analyzed
            </div>
            {processedDocs.length > 0 && (
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                Ready to assist
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-400 mt-12 space-y-4">
            <Bot className="w-16 h-16 mx-auto text-emerald-400/50" />
            <div className="space-y-2">
              <p className="font-medium">Ready to assist with your documents</p>
              <p className="text-sm">Ask me about document contents, signers, or status!</p>
            </div>
          </div>
        ) : (
          chatMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom`}
            >
              <div className={`max-w-[80%] rounded-lg p-4 flex space-x-3
                ${msg.role === 'user' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20' 
                  : 'bg-gray-800/50 border border-gray-700'
                }`}
              >
                {msg.role === 'ai' ? (
                  <Bot className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                ) : (
                  <User className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleChat();
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask about document contents, signers, or status..."
            className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || !userInput.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isSending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}