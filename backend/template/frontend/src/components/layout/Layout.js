import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Toaster } from "../ui/sonner";
import { RefreshCw } from "lucide-react";
import axios from "axios";
import getApiUrl from "../../config/api";

export function Layout() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    fetchVersion();
  }, []);

  const fetchVersion = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/version`);
      setVersion(response.data.version);
    } catch (error) {
      setVersion("1.0.0");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen">
        {/* Top Bar with Version */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 lg:px-8 py-3">
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
              <span className="text-gray-500 dark:text-gray-400">v{version || "..."}</span>
              <button 
                onClick={fetchVersion}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Versiyon yenile"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
