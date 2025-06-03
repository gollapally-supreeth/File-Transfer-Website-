
import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle, ArrowLeft, Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { gsap } from 'gsap';

const Success = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const checkIconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate check icon
      gsap.fromTo(checkIconRef.current, 
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.7)" }
      );

      // Animate container elements
      gsap.fromTo('.success-content', 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 0.3 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const copyToClipboard = async () => {
    if (!shareCode) return;
    
    try {
      await navigator.clipboard.writeText(shareCode);
      toast({
        title: "Copied to clipboard!",
        description: "Share code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

  const shareCode_url = `${window.location.origin}/download/${shareCode}`;

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'File Share',
          text: `Download files using code: ${shareCode}`,
          url: shareCode_url,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareCode_url);
        toast({
          title: "Link copied!",
          description: "Share link has been copied to your clipboard.",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareCode_url);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard.",
      });
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Upload Complete</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div ref={checkIconRef} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          <div className="success-content">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Files Uploaded Successfully!</h2>
            <p className="text-gray-600 mb-8">Your files have been uploaded and are ready to share.</p>
          </div>

          <div className="success-content bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Share Code</h3>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-4xl font-mono font-bold text-blue-600 tracking-widest">
                {shareCode}
              </div>
              <button
                onClick={copyToClipboard}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="success-content space-y-4">
            <button
              onClick={shareLink}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Share className="w-5 h-5" />
              <span>Share Link</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-4 rounded-xl font-semibold text-lg transition-all duration-300"
            >
              Send More Files
            </button>
          </div>

          <div className="success-content mt-8 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1 text-left">
              <li>• Your files will be available for 24 hours</li>
              <li>• Share the code with the intended recipient</li>
              <li>• Files will be automatically deleted after expiry</li>
              <li>• Maximum 100 downloads allowed per share code</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
