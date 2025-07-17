import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { STORAGE_CONFIG } from '@/lib/config';

const Receive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shareCode, setShareCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCode.trim()) {
      toast({
        title: "Please enter a share code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Navigate to download page with the share code
      navigate(`/download/${shareCode.toUpperCase()}`);
    } catch (error) {
      toast({
        title: "Invalid share code",
        description: "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Receive Files</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-10 h-10 text-white" />
            </div>            <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter Share Code</h2>
            <p className="text-gray-600">Enter the {STORAGE_CONFIG.shareCodeLength}-character code you received to download files</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="shareCode" className="block text-sm font-medium text-gray-700 mb-2">
                Share Code
              </label>              <input
                id="shareCode"
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                placeholder="ABC12345"
                maxLength={STORAGE_CONFIG.shareCodeLength}
                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
              />
            </div>            <button
              type="submit"
              disabled={isLoading || shareCode.length !== STORAGE_CONFIG.shareCodeLength}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Access Files'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Need help?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Share codes are {STORAGE_CONFIG.shareCodeLength} characters long</li>
              <li>• Codes expire after 24 hours</li>
              <li>• Contact the sender if the code doesn't work</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receive;
