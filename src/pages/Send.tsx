
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, ArrowLeft, File, Image, Video, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { gsap } from 'gsap';

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

const Send = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (file.type.startsWith('video/')) return <Video className="w-6 h-6" />;
    if (file.type.includes('text') || file.type.includes('document')) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFiles = useCallback((newFiles: FileList) => {
    const fileArray = Array.from(newFiles).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    setFiles(prev => [...prev, ...fileArray]);
    
    // Animate new files
    setTimeout(() => {
      gsap.fromTo('.file-item:last-child', 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3 }
      );
    }, 50);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate share code
      const { data: shareCodeData, error: shareCodeError } = await supabase
        .rpc('generate_share_code');
      
      if (shareCodeError) throw shareCodeError;

      // Create file session
      const { data: session, error: sessionError } = await supabase
        .from('file_sessions')
        .insert({ share_code: shareCodeData })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Upload files
      const uploadPromises = files.map(async ({ file }, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.id}/${Date.now()}_${index}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('shared-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save file metadata
        const { error: metadataError } = await supabase
          .from('files')
          .insert({
            session_id: session.id,
            filename: fileName,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: fileName
          });

        if (metadataError) throw metadataError;

        setUploadProgress(prev => prev + (100 / files.length));
      });

      await Promise.all(uploadPromises);

      toast({
        title: "Files uploaded successfully!",
        description: `Share code: ${shareCodeData}`,
      });

      navigate(`/success/${shareCodeData}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Send Files</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Drop Zone */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </h3>
            <p className="text-gray-500 mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Selected Files ({files.length})</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {files.map(({ file, id, preview }) => (
                  <div key={id} className="file-item flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {preview ? (
                        <img src={preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          {getFileIcon(file)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Uploading files...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={uploadFiles}
            disabled={files.length === 0 || isUploading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Send;
