import React, { useState } from 'react';
import { X, Coins, Check, CreditCard, Loader2 } from 'lucide-react';
import { User } from '../services/authService';
import { authService } from '../services/authService';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onPurchaseSuccess: (updatedUser: User) => void;
}

const PACKAGES = [
  { credits: 10, price: 5, label: 'Starter', popular: false },
  { credits: 50, price: 20, label: 'Best Value', popular: true },
  { credits: 100, price: 35, label: 'Pro', popular: false },
];

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({ isOpen, onClose, currentUser, onPurchaseSuccess }) => {
  const [isProcessing, setIsProcessing] = useState<number | null>(null); // ID of package being purchased
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async (pkgIndex: number, creditsToAdd: number, price: number) => {
    setIsProcessing(pkgIndex);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const record = await authService.purchaseCredits(currentUser.uid, currentUser.credits, creditsToAdd, price, 'Credit Card');
      const newTotal = currentUser.credits + creditsToAdd;
      
      const updatedHistory = currentUser.purchaseHistory ? [...currentUser.purchaseHistory, record] : [record];
      const updatedUser = { ...currentUser, credits: newTotal, purchaseHistory: updatedHistory };
      onPurchaseSuccess(updatedUser);
      setSuccessMessage(`Successfully added ${creditsToAdd} credits!`);
      
      setTimeout(() => {
        setSuccessMessage(null);
        setIsProcessing(null);
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Purchase failed", error);
      setIsProcessing(null);
      alert("Purchase failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-500 ease-out overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out border border-slate-200 dark:border-slate-800 my-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Buy Credits</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Current Balance: <span className="font-bold text-slate-900 dark:text-white">{currentUser.credits}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {successMessage ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in fade-in zoom-in">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Purchase Successful!</h3>
              <p className="text-slate-600 dark:text-slate-300">{successMessage}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {PACKAGES.map((pkg, index) => (
                <button
                  key={index}
                  onClick={() => handlePurchase(index, pkg.credits, pkg.price)}
                  disabled={isProcessing !== null}
                  className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${
                    pkg.popular 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  } ${isProcessing !== null && isProcessing !== index ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Best Value
                    </span>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      pkg.popular 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-white text-lg">{pkg.credits} Credits</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{pkg.label}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white text-lg">${pkg.price}</span>
                    {isProcessing === index ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                    ) : (
                      <div className={`p-2 rounded-lg ${
                        pkg.popular 
                          ? 'bg-blue-600 text-white group-hover:bg-blue-700' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                      } transition-colors`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!successMessage && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
            Secure payment processing powered by Stripe (Simulated)
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditPurchaseModal;
