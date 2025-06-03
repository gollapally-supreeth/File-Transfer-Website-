
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download as DownloadIcon, File, Image, Video, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileData {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

interface SessionData {
  id: string;
  share_code: string;
  expires_at: string;
  download_count: number;
  max_downloads: number;
}

const Download = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileData[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (shareCode) {
      loadFiles();
    }
  }, [shareCode]);

  const loadFiles = async () => {
    if (!shareCode) return;

    try {
      // Get session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('file_sessions')
        .select('*')
        .eq('share_code', shareCode)
        .single();

      if (sessionError) throw sessionError;

      // Check if session is expired
      if (new Date(sessionData.expires_at) < new Date()) {
        toast({
          title: "Share code expired",
          description: "This share code has expired.",
          variant: "destructive",
        });
        navigate('/receive');
        return;
      }

      setSession(sessionData);

      // Get files for this session
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('session_id', sessionData.id);

      if (filesError) throw filesError;

      setFiles(filesData || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Invalid share code",
        description: "The share code is invalid or has expired.",
        variant: "destructive",
      });
      navigate('/receive');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6" />;
    if (mimeType.includes('text') || mimeType.includes('document')) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = async (file: FileData) => {
    setDownloadingFiles(prev => new Set(prev).add(file.id));

    try {
      const { data, error } = await supabase.storage
        .from('shared-files')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update download count
      if (session) {
        await supabase
          .from('file_sessions')
          .update({ download_count: session.download_count + 1 })
          .eq('id', session.id);
      }

      toast({
        title: "Download started",
        description: `Downloading ${file.original_filename}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const downloadAll = async () => {
    for (const file of files) {
      await downloadFile(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/receive')}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Download Files</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Share Code: {shareCode}</h2>
              <p className="text-gray-600">{files.length} file{files.length !== 1 ? 's' : ''} available</p>
            </div>
            {files.length > 1 && (
              <button
                onClick={downloadAll}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Download All
              </button>
            )}
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    {getFileIcon(file.mime_type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.original_filename}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                </div>
                <button
                  onClick={() => downloadFile(file)}
                  disabled={downloadingFiles.has(file.id)}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>{downloadingFiles.has(file.id) ? 'Downloading...' : 'Download'}</span>
                </button>
              </div>
            ))}
          </div>

          {session && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p>Expires: {new Date(session.expires_at).toLocaleString()}</p>
              <p>Downloads: {session.download_count} / {session.max_downloads}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Download;
