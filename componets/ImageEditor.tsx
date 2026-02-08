import React, { useState, useRef } from 'react';
import { editImageWithGemini } from '../services/geminiService';
import { Wand2, Download, Upload, Image as ImageIcon } from 'lucide-react';

export const ImageEditor: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!selectedImage || !prompt) return;

    setIsProcessing(true);
    try {
      const newImage = await editImageWithGemini(selectedImage, prompt);
      if (newImage) {
        setSelectedImage(newImage);
        setPrompt(""); // Clear prompt on success
      } else {
        alert("Could not generate image edit.");
      }
    } catch (e) {
      alert("Error editing image.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent p-6 overflow-y-auto">
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-cyan-100 mb-6">
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 mb-2">
            <Wand2 className="text-cyan-600" />
            Creative Studio
          </h2>
          <p className="text-gray-600 font-medium">Upload a flashcard image or any photo and use AI commands to edit it (e.g., "Make it look like a cartoon", "Add a cat").</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8">
        {/* Image Area */}
        <div className="flex-1 bg-white/90 backdrop-blur rounded-3xl shadow-lg p-6 flex items-center justify-center border-2 border-dashed border-cyan-200 relative min-h-[400px]">
          {selectedImage ? (
            <img 
              src={selectedImage} 
              alt="Editing target" 
              className="max-h-full max-w-full object-contain rounded-xl shadow-md"
            />
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon size={64} className="mx-auto mb-4 opacity-50 text-cyan-300" />
              <p className="font-medium text-cyan-800/50">No image selected</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-cyan-600 font-bold hover:underline"
              >
                Upload Image
              </button>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Controls */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-black p-6 rounded-3xl shadow-2xl border border-zinc-800">
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full mb-4 flex items-center justify-center gap-2 py-3 border border-zinc-700 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition font-bold text-white"
             >
               <Upload size={20} /> Change Image
             </button>

             <label className="block text-sm font-black text-zinc-500 mb-2 uppercase tracking-wide">Magic Command</label>
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Add a red hat to the character..."
                className="w-full p-3 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none h-32 resize-none mb-4 bg-zinc-900 text-white placeholder-zinc-600 font-medium"
             />

             <button 
                onClick={handleEdit}
                disabled={!selectedImage || !prompt || isProcessing}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform hover:scale-[1.02] flex items-center justify-center gap-2
                  ${!selectedImage || !prompt || isProcessing ? 'bg-zinc-800 text-zinc-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
             >
                {isProcessing ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                ) : (
                    <>
                      <Wand2 size={20} /> Apply Magic
                    </>
                )}
             </button>
          </div>

          {selectedImage && (
             <a 
                href={selectedImage} 
                download="payero-creative-studio.png"
                className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition shadow-lg border border-white"
             >
                <Download size={20} /> Download Image
             </a>
          )}
        </div>
      </div>
    </div>
  );
};