import React, { useState, useEffect, useMemo } from 'react';
// 1. IMPORT FIX: Added createRoot from 'react-dom/client'
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';

// --- Global Variables/Constants (Mandatory Canvas Environment) ---
// 1. FIX: Use window. and safer checks for environment variables
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : null;
const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
// --- End Global Variables/Constants ---

// --- Authentication Constants ---
const HARDCODED_EMAIL = 'info@ingrowwthinnovations.in';
const HARDCODED_PASSWORD = 'InGrowwth@2025';
// NOTE: HARDCODED_MOCK_UID was removed. We now rely on the actual UID provided by Firebase Auth (auth.currentUser.uid)
// for file path security, but only enable file operations after successful mock login.
// --- End Authentication Constants ---

// --- Utility Functions for Style ---
const getFileTypeColor = (fileType) => {
  switch (fileType) {
    case 'pdf': return 'text-red-400';
    case 'docx':
    case 'txt':
    case 'pptx': return 'text-blue-400';
    case 'xlsx': return 'text-green-400';
    case 'zip': return 'text-orange-400';
    case 'folder': return 'text-yellow-400';
    default: return 'text-gray-400';
  }
};

// --- Icons (Using Lucide-like SVGs) ---
const FolderIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);
const FileIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const UploadIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const StarIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-yellow-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const TrashIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
);
const ClockIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const UserGroupIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const SearchIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
);
const SettingsIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1c.14-.32.23-.65.33-.98l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V15z"/></svg>
);
const GiftIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="2" y2="7"/><path d="M7.5 7v9h9V7"/></svg>
);
// --- End Icons ---

const NAV_ITEMS = [
  { name: 'My Drive', icon: FolderIcon, view: 'drive' },
  { name: 'Recent', icon: ClockIcon, view: 'recent' },
  { name: 'Shared with me', icon: UserGroupIcon, view: 'shared' },
  { name: 'Starred', icon: StarIcon, view: 'starred' },
  { name: 'Trash', icon: TrashIcon, view: 'trash' },
  { name: 'Settings', icon: SettingsIcon, view: 'settings' },
  { name: 'Upgrade Storage', icon: GiftIcon, view: 'upgrade' },
];

const FileRow = ({ file, onDelete }) => {
  const isFolder = file.type === 'folder';
  const Icon = isFolder ? FolderIcon : FileIcon;
  const dateStr = file.lastModified ? new Date(file.lastModified.toMillis()).toLocaleString() : 'N/A';
  const sizeStr = isFolder ? '—' : file.size;
  const fileColor = isFolder ? getFileTypeColor('folder') : getFileTypeColor(file.fileType);

  return (
    // Enhanced row styling: card look with hover effect and group class for children control
    <div className="flex items-center justify-between px-4 py-3 md:py-4 bg-gray-800 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer group rounded-lg mb-2 shadow-md hover:shadow-xl border border-gray-700/50">
      <div className="flex items-center space-x-4 w-1/2 md:w-5/12">
        {/* Dynamic Icon Color */}
        <Icon className={`w-5 h-5 flex-shrink-0 ${fileColor}`} />
        <span className="truncate text-base font-medium text-gray-100 group-hover:text-indigo-300">{file.name}</span>
      </div>
      <div className="hidden md:block w-3/12 text-sm font-light text-gray-400 truncate">
        {isFolder ? 'Folder' : `.${file.fileType.toUpperCase()}`}
      </div>
      <div className="w-1/4 md:w-3/12 text-sm font-light text-gray-400 hidden sm:block">
        {dateStr}
      </div>
      <div className="w-1/4 md:w-1/12 text-sm font-light text-gray-400 text-right">
        {sizeStr}
      </div>
      {/* Delete button: visible only on hover on desktop, or always visible on mobile/tablet */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
        className="ml-4 p-2 rounded-full text-red-400 hover:text-red-300 hover:bg-gray-600 transition-all md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:translate-x-2"
        aria-label={`Delete ${file.name}`}
      >
        <TrashIcon className="w-4 h-4"/>
      </button>
    </div>
  );
};

// Utility function to generate a random file object (unchanged)
const generateRandomFile = (type = 'file') => {
    const fileNames = ['Project_Report', 'Meeting_Notes', 'Q3_Earnings', 'Design_Mockup', 'Tax_Documents', 'Vacation_Photos'];
    const folderNames = ['Client Projects', 'Archive', 'Marketing', 'Personal'];
    const fileTypes = ['pdf', 'docx', 'xlsx', 'png', 'txt', 'pptx', 'zip'];
    const randomName = type === 'folder'
        ? folderNames[Math.floor(Math.random() * folderNames.length)]
        : `${fileNames[Math.floor(Math.random() * fileNames.length)]}.${fileTypes[Math.floor(Math.random() * fileTypes.length)]}`;

    const sizes = ['1.2 MB', '5 KB', '23.8 MB', '345 KB', '15.1 MB', '4.2 MB', '105 KB'];
    const randomSize = sizes[Math.floor(Math.random() * sizes.length)];

    return {
        name: randomName,
        type: type,
        fileType: type === 'folder' ? 'folder' : randomName.split('.').pop(),
        size: randomSize,
        lastModified: serverTimestamp(),
        createdAt: serverTimestamp(),
    };
};

const StorageUsage = ({ used, total }) => {
  const percentage = Math.round((used / total) * 100);
  return (
    <div className="mt-8 p-4 bg-gray-800 rounded-xl border border-indigo-600/50 shadow-inner">
      <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
        Cloud Storage
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </h3>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-400">
        <span className="font-medium text-gray-200">{used} GB</span> of {total} GB used ({percentage}%)
      </p>
    </div>
  );
};

const ProfileModal = ({ isOpen, onClose, userInfo, updateUserInfo }) => {
    const [name, setName] = useState(userInfo.name);
    const [email, setEmail] = useState(userInfo.email);
    const [phone, setPhone] = useState(userInfo.phone);
    const [photo, setPhoto] = useState(userInfo.photoUrl);

    if (!isOpen) return null;

    const handleSave = () => {
        updateUserInfo({
            name,
            email,
            phone,
            // In a real app, this would involve uploading the photo
            photoUrl: photo, 
            initials: name.split(' ').map(n => n[0]).join('').toUpperCase() || 'AG'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-indigo-600/50 transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()} // Stop propagation to prevent closing when clicking inside
            >
                <h3 className="text-2xl font-bold text-indigo-400 mb-6 border-b border-gray-700 pb-3">Update Profile</h3>
                
                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-indigo-300 mb-3 border-4 border-indigo-500">
                        {userInfo.initials}
                    </div>
                    <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                        Change Profile Photo (Mock)
                    </button>
                </div>

                <div className="space-y-4">
                    <label className="block">
                        <span className="text-gray-400 text-sm block mb-1">Full Name</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/50 transition"
                        />
                    </label>
                    <label className="block">
                        <span className="text-gray-400 text-sm block mb-1">Email Address</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/50 transition"
                        />
                    </label>
                    <label className="block">
                        <span className="text-gray-400 text-sm block mb-1">Phone Number</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full p-3 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/50 transition"
                            placeholder="e.g., +91 98765 43210"
                        />
                    </label>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const AuthScreen = ({ onLogin, hardcodedEmail, hardcodedPassword, isLoginPage, setIsLoginPage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // States for Signup (mock)
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (isLoginPage) {
            if (email === hardcodedEmail && password === hardcodedPassword) {
                // Successful mock login
                onLogin({ name: 'InGrowwth Admin', email: hardcodedEmail, phone: 'N/A', initials: 'IA' });
            } else {
                setError('Invalid credentials. Please use the hardcoded admin account.');
                setLoading(false);
            }
        } else {
            // Mock Signup: Just validate non-empty fields and redirect to login
            if (name && email && password) {
                setError('Signup successful! Please log in using the hardcoded admin credentials.');
                setLoading(false);
                setTimeout(() => {
                    setIsLoginPage(true);
                    setError('');
                }, 2000);
            } else {
                setError('Please fill in all fields.');
                setLoading(false);
            }
        }
    };

    const toggleMode = () => {
        setIsLoginPage(!isLoginPage);
        setError('');
        setEmail('');
        setPassword('');
        setName('');
        setPhone('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-3xl p-8 md:p-10 shadow-2xl border border-indigo-600/50">
                <h1 className="text-4xl font-extrabold text-center text-indigo-400 mb-2">Bharat Drive</h1>
                <p className="text-center text-gray-400 mb-8">
                    {isLoginPage ? 'Sign In to access your files' : 'Create your Bharat Drive account'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLoginPage && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-4 bg-gray-700 text-gray-100 rounded-xl border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500/50 transition shadow-inner"
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-4 bg-gray-700 text-gray-100 rounded-xl border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500/50 transition shadow-inner"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-gray-700 text-gray-100 rounded-xl border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500/50 transition shadow-inner"
                    />
                    {!isLoginPage && (
                        <input
                            type="tel"
                            placeholder="Phone Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full p-4 bg-gray-700 text-gray-100 rounded-xl border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500/50 transition shadow-inner"
                        />
                    )}

                    {error && (
                        <p className={`text-center p-3 rounded-lg ${isLoginPage ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30'}`}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full p-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 flex items-center justify-center"
                    >
                        {loading ? 'Processing...' : (isLoginPage ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <p className="text-center text-gray-400 text-sm mt-6">
                    {isLoginPage ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={toggleMode} 
                        className="ml-2 font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                        {isLoginPage ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>

                {isLoginPage && (
                    <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-xs text-center text-gray-300">
                        <p>Use the hardcoded admin credentials to proceed:</p>
                        <p className="mt-1 font-mono">Email: **{hardcodedEmail}**</p>
                        <p className="font-mono">Password: **{hardcodedPassword}**</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// 2. FIX: Renamed the component to match the file name (CloudDrive.jsx)
export default function CloudDrive() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('drive');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginPage, setIsLoginPage] = useState(true);
  
  // User Info State
  const [userInfo, setUserInfo] = useState({ 
    name: 'A. I. Gemini', 
    email: 'gemini@google.com',
    initials: 'AG',
    phone: '+91 98765 43210',
    photoUrl: null,
    storageUsedGB: 10.5,
    storageTotalGB: 15,
  });
  
  const updateUserInfo = (newFields) => {
    setUserInfo(prev => ({ ...prev, ...newFields }));
  };
  
  const handleLogin = (userCredentials) => {
    // 1. Update client-side user info
    setUserInfo(prev => ({
        ...prev,
        ...userCredentials,
        initials: userCredentials.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        email: HARDCODED_EMAIL, // Ensure email is correctly set
        phone: 'N/A' // Mock phone number
    }));
    
    // 2. Set authentication status. This will trigger the Firestore listener.
    setIsAuthenticated(true);
    
    // NOTE: The userId is deliberately NOT set here. It is handled by onAuthStateChanged 
    // to match the actual UID required by Firebase Security Rules.
  };
  
  const handleSignOut = () => {
      // Clear client state and revert to login page
      setIsAuthenticated(false);
      // We keep the userId populated to avoid immediate re-fetch attempts, but
      // the isAuthenticated gate prevents file operations.
      setFiles([]);
      setLoading(false);
      setIsLoginPage(true);
  };


  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    if (firebaseConfig) {
      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authService = getAuth(app);

        setDb(firestore);
        setAuth(authService);
        
        // Establish an anonymous/custom token connection for the environment
        const signIn = async () => {
          if (initialAuthToken) {
            await signInWithCustomToken(authService, initialAuthToken);
          } else {
            await signInAnonymously(authService);
          }
        };
        signIn();
        
        // ADDED: Capture the actual UID provided by the Canvas environment's sign-in
        const unsubscribe = authService.onAuthStateChanged((user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            setUserId(null); 
          }
        });
        return () => unsubscribe();
        // END ADDED

      } catch (error) {
        console.error("Firebase initialization failed:", error);
      }
    } else {
        console.warn("Firebase config is missing. Using mock data only.");
        // If config is missing, mock authentication entirely
        if (!isAuthenticated) {
            setLoading(false);
        } else {
            // Mock data used if authenticated and config missing
            setFiles([
                { id: '1', name: 'Marketing Plans 2024', type: 'folder', fileType: 'folder', size: '—', lastModified: { toMillis: () => Date.now() - 86400000 * 5 } },
                { id: '2', name: 'Q4 Budget.xlsx', type: 'file', fileType: 'xlsx', size: '1.2 MB', lastModified: { toMillis: () => Date.now() - 86400000 * 2 } },
                { id: '3', name: 'Design Assets.zip', type: 'file', fileType: 'zip', size: '45.7 MB', lastModified: { toMillis: () => Date.now() - 86400000 * 1 } },
                { id: '4', name: 'Project Brief.pdf', type: 'file', fileType: 'pdf', size: '345 KB', lastModified: { toMillis: () => Date.now() - 86400000 * 0.5 } },
                { id: '5', name: 'Shared Documents', type: 'folder', fileType: 'folder', size: '—', lastModified: { toMillis: () => Date.now() - 86400000 * 0.1 } },
            ]);
            setLoading(false);
        }
    }
  }, []); // Empty dependency array as isAuthenticated is handled via other effects/gates

  // 2. Firestore Data Subscription - Only runs if explicitly authenticated AND UID is available
  useEffect(() => {
    if (db && userId && isAuthenticated) {
      setLoading(true);
      // Path uses the actual authenticated UID from the environment (userId)
      const filesColRef = collection(db, 'artifacts', appId, 'users', userId, 'files');
      const q = query(filesColRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedFiles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFiles(fetchedFiles);
        setLoading(false);
      }, (error) => {
        // This is where the permission error was caught, now it should resolve.
        console.error("Error fetching files:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
    // Dependency includes isAuthenticated to re-trigger after successful mock login
  }, [db, userId, isAuthenticated]);

  // 3. Data Actions (Only run if authenticated)
  const handleAddNewItem = async (type) => {
    if (!db || !userId || !isAuthenticated) {
        console.error("User not authenticated or Database not ready. Cannot add item.");
        return;
    }

    const newItem = generateRandomFile(type);
    
    try {
        const colRef = collection(db, 'artifacts', appId, 'users', userId, 'files');
        // FIX: Ensure crypto is available or use a reliable fallback for unique ID generation
        const newDocRef = doc(colRef, window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 9)); 
        await setDoc(newDocRef, newItem);
        console.log("New item added:", newItem.name);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!db || !userId || !isAuthenticated) {
        console.error("User not authenticated or Database not ready. Cannot delete item.");
        return;
    }

    try {
        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'files', id);
        await deleteDoc(docRef);
        console.log("Item deleted:", id);
    } catch (e) {
        console.error("Error deleting document: ", e);
    }
  };


  // 4. Filtered and Sorted Files (unchanged)
  const filteredFiles = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    let result = files.filter(file => file.name.toLowerCase().includes(lowerCaseSearch));

    // View Filtering Logic
    if (currentView === 'recent') {
        result = result.sort((a, b) => (b.lastModified?.toMillis() || 0) - (a.lastModified?.toMillis() || 0)).slice(0, 5);
    } else if (currentView === 'shared') {
        result = result.filter(file => file.type === 'folder' || file.fileType === 'pdf' || file.fileType === 'docx');
    } else if (currentView === 'starred') {
        result = result.filter(file => file.type === 'folder');
    } else if (currentView === 'trash') {
        result = result.filter(file => file.type === 'file');
    } else if (currentView === 'upgrade') {
        return [];
    }

    return result.sort((a, b) => {
        const aTime = a.lastModified?.toMillis() || 0;
        const bTime = b.lastModified?.toMillis() || 0;
        return bTime - aTime;
    });

  }, [files, searchTerm, currentView]);


  // 5. Component Structure (UI) - Main App and Header are conditionally rendered

  if (!isAuthenticated) {
      return (
          <AuthScreen 
              onLogin={handleLogin} 
              hardcodedEmail={HARDCODED_EMAIL}
              hardcodedPassword={HARDCODED_PASSWORD}
              isLoginPage={isLoginPage}
              setIsLoginPage={setIsLoginPage}
          />
      );
  }

  // --- Drive UI Components (Rendered only if isAuthenticated is true) ---

  const Sidebar = () => (
    <nav className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 w-64 bg-gray-900 border-r border-gray-700 p-4 pt-16 md:pt-4 z-20 h-full md:h-auto overflow-y-auto`}>
      <button
        onClick={() => handleAddNewItem('file')}
        className="w-full mb-6 p-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center text-lg transform hover:scale-[1.02] active:scale-100"
      >
        <UploadIcon className="w-5 h-5 mr-3" />
        New Item
      </button>

      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.name} className="my-1">
            <button
              onClick={() => {
                setCurrentView(item.view);
                setIsSidebarOpen(false); // Close sidebar on mobile after click
              }}
              className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 ${
                currentView === item.view
                  ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/50'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="text-base">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
      
      {/* Storage Usage Widget */}
      <StorageUsage used={userInfo.storageUsedGB} total={userInfo.storageTotalGB} />

      {/* User ID Footer */}
      <div className="mt-8 p-3 border-t border-gray-700 text-sm text-gray-500 text-center">
        <p className='text-xs font-semibold text-gray-400 mb-1'>Current Session ID:</p>
        <span className="text-xs break-all text-gray-400">{userId || 'Loading...'}</span>
      </div>
    </nav>
  );

  const Header = () => (
    <header className="flex items-center justify-between p-4 md:p-6 bg-gray-800 border-b border-gray-700 sticky top-0 z-10 shadow-lg">
      <div className="flex items-center">
        <button className="md:hidden mr-4 p-2 rounded-lg hover:bg-gray-700 text-white" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
        </button>
        {/* Project Name Change */}
        <h1 className="text-2xl font-extrabold text-indigo-400 tracking-wider">Bharat Drive</h1>
      </div>

      {/* Search Bar (Desktop) */}
      <div className="flex-1 max-w-2xl mx-4 hidden lg:block">
        <div className="relative">
          <input
            type="text"
            placeholder={`Search your ${NAV_ITEMS.find(i => i.view === currentView)?.name || 'Drive'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 bg-gray-900 text-gray-100 placeholder-gray-500 rounded-full border border-gray-700 focus:border-indigo-500 focus:ring focus:ring-indigo-500/50 transition shadow-inner"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* User Profile and Mobile Search */}
      <div className="flex items-center space-x-4">
        {/* Mobile/Tablet Search */}
        <div className="relative lg:hidden">
            <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-24 sm:w-48 py-2 pl-3 pr-1 bg-gray-900 text-gray-100 placeholder-gray-500 rounded-full border border-gray-700 focus:border-indigo-500 transition text-sm shadow-inner"
            />
        </div>
        
        {/* User Profile Button - Opens Modal */}
        <div className="relative group">
            <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-white font-bold text-sm shadow-lg ring-2 ring-indigo-400/50 transition-all hover:ring-indigo-300"
            >
              {userInfo.initials}
            </button>
            {/* Mock Dropdown for Quick Info */}
            <div className="absolute right-0 mt-2 w-56 bg-gray-700 rounded-xl shadow-2xl p-4 text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform scale-95 group-hover:scale-100 origin-top-right border border-gray-600">
                <p className="font-bold text-gray-100 truncate">{userInfo.name}</p>
                <p className="text-gray-400 truncate text-xs mb-3">{userInfo.email}</p>
                <div className="border-t border-gray-600 pt-3">
                    <button 
                        onClick={() => setIsProfileModalOpen(true)} 
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer block w-full text-left"
                    >
                        Update Profile
                    </button>
                    <button 
                        onClick={handleSignOut} 
                        className="text-gray-300 hover:text-gray-200 mt-1 cursor-pointer block w-full text-left"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col antialiased">
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black opacity-50 z-10 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <h2 className="text-3xl font-bold mb-6 capitalize text-gray-200">
            {NAV_ITEMS.find(i => i.view === currentView)?.name || 'My Drive'}
          </h2>

          <div className="bg-gray-900 rounded-2xl shadow-xl p-4 md:p-6"> {/* Changed container color for contrast */}
            
            {/* Table Header (Desktop/Tablet) - Added margin/padding to match new row style */}
            <div className="hidden md:flex items-center justify-between px-4 py-3 font-semibold text-gray-400 border-b-2 border-indigo-600/50 mb-3">
              <span className="w-5/12">Name</span>
              <span className="w-3/12">Type</span>
              <span className="w-3/12">Last Modified</span>
              <span className="w-1/12 text-right">Size</span>
              <span className="w-10"></span> {/* for the delete button column */}
            </div>

            {loading ? (
              <div className="p-10 text-center text-indigo-400 text-xl">Loading files...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-lg mb-2">
                  {currentView === 'upgrade' ? 
                   "Unlock more power! Upgrade your Bharat Drive storage today." :
                   `No files found in ${NAV_ITEMS.find(i => i.view === currentView)?.name || 'My Drive'} matching your criteria.`
                  }
                </p>
                {currentView === 'drive' && (
                    <button 
                        onClick={() => handleAddNewItem('file')}
                        className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition font-medium"
                    >
                        Create Your First File
                    </button>
                )}
                {currentView === 'upgrade' && (
                    <button 
                        onClick={() => console.log('Simulating Upgrade')}
                        className="mt-4 px-6 py-2 bg-pink-600 rounded-lg hover:bg-pink-700 transition font-bold shadow-md"
                    >
                        Buy More GB
                    </button>
                )}
              </div>
            ) : (
              // No need for divide-y, the rows have a margin/shadow now
              <div>
                {filteredFiles.map((file) => (
                  <FileRow 
                    key={file.id} 
                    file={file} 
                    onDelete={handleDeleteItem} 
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Profile Update Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        userInfo={userInfo}
        updateUserInfo={updateUserInfo}
      />
    </div>
  );
}

// 3. CRITICAL FIX: Add the module execution block to manually mount the component.
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<CloudDrive />);
} else {
    console.error("The <div id='root'> element is missing from your index.html. React cannot mount the app.");
}
