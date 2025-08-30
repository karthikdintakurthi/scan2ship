'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

import { useAuth } from '@/contexts/AuthContext';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentDetails {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRef: string;
}

  interface ConfirmationDetails {
    screenshot: File | null;
    validationResult: any | null;
  }

const RECHARGE_AMOUNTS = [1000, 2000, 5000, 10000];

export default function RechargeModal({ isOpen, onClose, onSuccess }: RechargeModalProps) {
  const { currentUser, currentClient } = useAuth();
  const errorRef = useRef<HTMLDivElement>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    payeeVpa: 'scan2ship@ybl',
    payeeName: 'Scan2Ship',
    amount: 0,
    transactionNote: '',
    transactionRef: ''
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState<'amount' | 'payment' | 'confirmation'>('amount');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmationDetails>({
    screenshot: null,
    validationResult: null
  });

  // Check if user is on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAmount(null);
      setPaymentDetails({
        payeeVpa: 'scan2ship@ybl',
        payeeName: 'Scan2Ship',
        amount: 0,
        transactionNote: '',
        transactionRef: ''
      });
      setQrCodeDataUrl('');
      setStep('amount');
      setError('');
      setConfirmationDetails({
        screenshot: null,
        validationResult: null
      });
    }
  }, [isOpen]);

  // Scroll to error message when error occurs
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [error]);

  const handleAmountSelect = async (amount: number) => {
    setSelectedAmount(amount);
    setPaymentDetails(prev => ({ ...prev, amount }));
    
    // Generate QR code immediately after amount selection
    try {
      setIsLoading(true);
      setError('');
      
      // Generate transaction reference
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const transactionRef = `RECHARGE-${currentClient?.id?.substring(0, 8)}-${timestamp}-${randomId}`;

      // Update payment details with generated reference
      const updatedDetails = {
        payeeVpa: 'scan2ship@ybl',           // Always use correct UPI ID
        payeeName: 'Scan2Ship',               // Always use correct Payee Name
        amount,
        transactionRef,
        transactionNote: `Credit Recharge - ${currentClient?.companyName || 'Scan2Ship'}`
      };

      setPaymentDetails(updatedDetails);

      // Construct UPI payment link using URLSearchParams for proper encoding
      const params = new URLSearchParams({
        pa: 'scan2ship@ybl',                  // Payee VPA (UPI ID) - hardcoded
        pn: 'Scan2Ship',                      // Payee name - hardcoded
        am: String(amount),                   // Amount
        cu: "INR",                            // Currency
        tn: updatedDetails.transactionNote    // Transaction note
      });
      
      const upiLink = `upi://pay?${params.toString()}`;

      // Log the generated UPI link for debugging
      console.log('🔗 Generated UPI Link:', upiLink);
      console.log('💰 Amount:', amount);
      console.log('👤 Payee VPA: scan2ship@ybl (hardcoded)');
      console.log('🏢 Payee Name: Scan2Ship (hardcoded)');
      console.log('📝 Transaction Note:', updatedDetails.transactionNote);
      console.log('🔍 Payment Details State:', updatedDetails);

      // Generate QR code with better options
      const qrDataUrl = await QRCode.toDataURL(upiLink, {
        errorCorrectionLevel: "H",
        margin: 2,
        scale: 8,
        width: 300
      });

      setQrCodeDataUrl(qrDataUrl);
      setStep('payment');
    } catch (error) {
      console.error('Error generating UPI link:', error);
      setError('Failed to generate payment QR code');
    } finally {
      setIsLoading(false);
    }
  };





  const handlePaymentComplete = () => {
    // Move to confirmation step instead of calling API directly
    setStep('confirmation');
  };

  const handleConfirmationSubmit = async () => {
    if (!confirmationDetails.validationResult?.finalValidationPassed) {
      setError('Please upload a valid payment screenshot first');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Submit confirmation details as JSON
      const response = await fetch('/api/credits/verify-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionRef: paymentDetails.transactionRef,
          amount: paymentDetails.amount,
          utrNumber: confirmationDetails.validationResult.utrNumber,
          paymentDetails: {
            payeeVpa: paymentDetails.payeeVpa,
            payeeName: paymentDetails.payeeName,
            transactionNote: paymentDetails.transactionNote
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to submit payment confirmation');
      }
    } catch (error) {
      console.error('Error submitting confirmation:', error);
      setError('Failed to submit payment confirmation');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePaymentScreenshot = async (file: File) => {
    try {
      setIsLoading(true);
      setError('Validating payment screenshot with AI...');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('screenshot', file);
      formData.append('expectedAmount', paymentDetails.amount.toString());
      formData.append('transactionRef', paymentDetails.transactionRef);

      console.log('📤 [RechargeModal] Sending payment screenshot for AI validation...');

      const response = await fetch('/api/validate-payment-screenshot', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ [RechargeModal] AI validation successful:', data.validationResult);
        
        // Update confirmation details with validation result
        setConfirmationDetails(prev => ({
          ...prev,
          screenshot: null, // Don't store the image
          validationResult: data.validationResult
        }));

        // Show appropriate message based on validation result
        if (data.validationResult.finalValidationPassed) {
          setError('');
        } else {
          setError(`❌ Validation Failed: ${data.validationResult.validationMessage}`);
        }
      } else {
        console.error('❌ [RechargeModal] AI validation failed:', data.error);
        setError(data.error || 'Failed to validate payment screenshot');
      }
    } catch (error) {
      console.error('❌ [RechargeModal] Error validating payment screenshot:', error);
      setError('Failed to validate payment screenshot. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (PNG, JPG, JPEG)');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }
      
      // Validate payment screenshot using OpenAI
      await validatePaymentScreenshot(file);
    }
  };

  const handleDeepLink = () => {
    // Build UPI deep link with proper encoding
    const upiUrl = `upi://pay?pa=scan2ship@ybl&pn=Scan2Ship&am=${paymentDetails.amount}&cu=INR&tn=${encodeURIComponent(paymentDetails.transactionNote)}`;
    
    // Build Android intent fallback
    const intentUrl = `intent://pay?pa=scan2ship@ybl&pn=Scan2Ship&am=${paymentDetails.amount}&cu=INR&tn=${encodeURIComponent(paymentDetails.transactionNote)}#Intent;scheme=upi;end`;

    // Try native UPI deep link first
    window.location.href = upiUrl;

    // If no app handles it, after 1s fallback to Android intent
    setTimeout(() => {
      window.location.href = intentUrl;
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recharge Credits</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {error && (
            <div ref={errorRef} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Amount Selection */}
          {step === 'amount' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Recharge Amount</h3>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating payment QR code...
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {RECHARGE_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                    >
                      <div className="text-2xl font-bold text-gray-900">₹{amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Credits</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* Step 2: Payment */}
          {step === 'payment' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Payment</h3>
              
              {/* Payment Summary */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="text-center mb-3">
                  <h4 className="text-lg font-semibold text-blue-900">Payment Details</h4>
                </div>
                
                {/* Payee Information - Prominently Displayed */}
                <div className="text-center mb-4 p-3 bg-white border border-blue-200 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">Payment will be sent to:</div>
                  <div className="text-xl font-bold text-blue-900 mb-1">{paymentDetails.payeeName}</div>
                  <div className="text-sm text-gray-500">Official Scan2Ship Account</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block">Amount</span>
                    <span className="text-xl font-bold text-blue-900">₹{paymentDetails.amount.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block">UPI ID</span>
                    <span className="text-lg font-mono font-semibold text-blue-900">{paymentDetails.payeeVpa}</span>
                  </div>
                </div>
                

              </div>

              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="text-center mb-4">
                  <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                    <img src={qrCodeDataUrl} alt="UPI Payment QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Scan this QR code with any UPI app
                  </p>
                </div>
              )}



              {/* Action Buttons */}
                              <div className="flex space-x-3">
                  <button
                    onClick={() => setStep('amount')}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back to Amount Selection
                  </button>
                <button
                  onClick={handlePaymentComplete}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'I Have Made Payment'}
                </button>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Payment Instructions:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Scan the QR code with any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                  <li>• Verify the payment details before confirming</li>
                  <li>• Complete the payment in your UPI app</li>
                  <li>• Click "Payment Complete" after successful payment</li>
                </ul>
              </div>

              {/* Important Notice */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Important:</h4>
                <p className="text-xs text-yellow-800">
                  After completing the payment, you will need to upload a screenshot of your payment confirmation 
                  that shows the <strong>UTR number</strong> and payment details in the next screen. 
                  This is mandatory for payment verification.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirmation' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Confirmation</h3>
              
              {/* Payment Summary */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="text-center mb-3">
                  <h4 className="text-sm font-medium text-blue-900">Payment Summary</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block">Amount</span>
                    <span className="text-lg font-bold text-blue-900">₹{paymentDetails.amount.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block">Transaction Ref</span>
                    <span className="text-xs font-mono text-blue-900 break-all">{paymentDetails.transactionRef}</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Form */}
              <div className="space-y-4">
                {/* Screenshot Upload for AI Validation */}
                <div>
                  <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Payment Screenshot for AI Validation
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="screenshot"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                    <label htmlFor="screenshot" className={`cursor-pointer ${isLoading ? 'opacity-50' : ''}`}>
                      <div className="space-y-2">
                        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600">
                          {isLoading ? 'Validating with AI...' : 'Click to upload payment screenshot'}
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</p>
                        <p className="text-xs text-blue-600 font-medium">AI will validate UTR and amount automatically</p>
                      </div>
                    </label>
                  </div>
                  
                  {/* AI Validation Results */}
                  {confirmationDetails.validationResult && (
                    <div className="mt-4 p-4 border rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">AI Validation Results</h4>
                      
                      {/* UTR Validation */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">UTR Number:</span> 
                          {confirmationDetails.validationResult.utrFound ? (
                            <span className="text-green-600 ml-1">✅ {confirmationDetails.validationResult.utrNumber}</span>
                          ) : (
                            <span className="text-red-600 ml-1">❌ Not found</span>
                          )}
                        </p>
                      </div>

                      {/* Amount Validation */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Payment Amount:</span> 
                          {confirmationDetails.validationResult.amountMatches ? (
                            <span className="text-green-600 ml-1">✅ ₹{confirmationDetails.validationResult.paymentAmount?.toLocaleString()}</span>
                          ) : (
                            <span className="text-red-600 ml-1">❌ ₹{confirmationDetails.validationResult.paymentAmount?.toLocaleString()} (Expected: ₹{paymentDetails.amount.toLocaleString()})</span>
                          )}
                        </p>
                      </div>

                      {/* Payment Status */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Payment Status:</span> 
                          {confirmationDetails.validationResult.paymentSuccessful ? (
                            <span className="text-green-600 ml-1">✅ Success</span>
                          ) : (
                            <span className="text-red-600 ml-1">❌ {confirmationDetails.validationResult.paymentStatus}</span>
                          )}
                        </p>
                      </div>

                      {/* UPI ID Validation */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">UPI ID:</span> 
                          {confirmationDetails.validationResult.upiIdMatches ? (
                            <span className="text-green-600 ml-1">✅ scan2ship@ybl</span>
                          ) : (
                            <span className="text-red-600 ml-1">❌ {confirmationDetails.validationResult.upiId || 'Not found'} (Expected: scan2ship@ybl)</span>
                          )}
                        </p>
                      </div>

                      {/* Overall Validation */}
                      <div className="mt-4 p-3 rounded-md">
                        {confirmationDetails.validationResult.finalValidationPassed ? (
                          <div className="bg-green-50 border border-green-200 rounded-md p-3">
                            <p className="text-sm text-green-800 font-medium">✅ Validation Passed</p>
                            <p className="text-xs text-green-600 mt-1">All checks passed. You can proceed with submission.</p>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-800 font-medium">❌ Validation Failed</p>
                            <p className="text-xs text-red-600 mt-1">{confirmationDetails.validationResult.validationMessage}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Note */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Upload a clear payment screenshot for AI validation. 
                    The AI will automatically extract and validate:
                    <br />• UTR number (only from explicit mentions)
                    <br />• Payment amount (must match exactly)
                    <br />• Payment status (must be successful)
                    <br />

                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setStep('payment')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Payment
                </button>
                <button
                  onClick={handleConfirmationSubmit}
                  disabled={isLoading || !confirmationDetails.validationResult?.finalValidationPassed}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Submitting...' : 
                    !confirmationDetails.validationResult?.finalValidationPassed
                      ? 'Upload Valid Screenshot First' 
                      : 'Submit Confirmation'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
