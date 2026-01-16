import React, { useState, useEffect } from 'react';
import { X, Lock, Server, Globe, Zap, Settings } from 'lucide-react';
import { OcrMode, BridgeConfig } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: OcrMode;
  bridgeConfig: BridgeConfig;
  onSave: (mode: OcrMode, bridgeConfig: BridgeConfig) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentMode, 
  bridgeConfig: initialBridgeConfig 
}) => {
  const [activeTab, setActiveTab] = useState<OcrMode>(currentMode);
  const [localBridgeConfig, setLocalBridgeConfig] = useState<BridgeConfig>(initialBridgeConfig);

  useEffect(() => {
    if (isOpen) {
        setActiveTab(currentMode);
        setLocalBridgeConfig(initialBridgeConfig);
    }
  }, [isOpen, currentMode, initialBridgeConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Settings className="w-5 h-5 text-slate-500" />
            OCR Configuration
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab(OcrMode.DIRECT)}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                ${activeTab === OcrMode.DIRECT 
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            >
                <Zap className="w-4 h-4" />
                Gemini Direct
            </button>
            <button 
                onClick={() => setActiveTab(OcrMode.BRIDGE)}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                ${activeTab === OcrMode.BRIDGE 
                    ? 'border-purple-500 text-purple-600 bg-purple-50/50' 
                    : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            >
                <Globe className="w-4 h-4" />
                Bridge Mode
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === OcrMode.DIRECT ? (
             <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-700 flex gap-3">
                    <Zap className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <p className="font-bold mb-1">Direct Mode Active</p>
                        <p>The application will use the system-configured Gemini 3 Flash model for high-speed local processing.</p>
                    </div>
                </div>
             </div>
          ) : (
             <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg text-sm text-purple-700 flex gap-3">
                    <Server className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <p className="font-bold mb-1">Bridge Mode (Enterprise)</p>
                        <p>Integrate with your own backend for custom processing and storage.</p>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Base URL</label>
                    <input
                        type="text"
                        value={localBridgeConfig.baseUrl}
                        onChange={(e) => setLocalBridgeConfig({...localBridgeConfig, baseUrl: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Endpoint Path</label>
                    <input
                        type="text"
                        value={localBridgeConfig.endpoint}
                        onChange={(e) => setLocalBridgeConfig({...localBridgeConfig, endpoint: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">X-Api-Key</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                        type="password"
                        value={localBridgeConfig.apiKey}
                        onChange={(e) => setLocalBridgeConfig({...localBridgeConfig, apiKey: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono"
                        />
                    </div>
                </div>
             </div>
          )}
        </div>
          
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
            <button
              onClick={() => { onSave(activeTab, localBridgeConfig); onClose(); }}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all ${activeTab === OcrMode.DIRECT ? 'bg-blue-600' : 'bg-purple-600'}`}
            >
              Save Configuration
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;