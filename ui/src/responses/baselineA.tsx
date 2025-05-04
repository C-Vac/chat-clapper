// Sample script to test the UI development environment: GM functions should hopefully be detected in this context and the config object can be manipulated by the code.
import { useState, useEffect } from 'react';

type Selector = {
  container: string;
  author: string;
  content: string;
};

type Site = {
  label?: string;
  users: string[];
  selectors: Selector;
};

type Config = {
  replacementText: string;
  delaySeconds: number;
  sites: Record<string, Site>;
};

const defaultConfig: Config = {
  replacementText: '[Message Clapped]',
  delaySeconds: 5,
  sites: {
    'example.com': {
      label: 'Example Site',
      users: [],
      selectors: {
        container: '.message',
        author: '.author',
        content: '.content'
      }
    }
  }
};

const UserscriptSettingsDashboard = () => {
  const [isUserscriptEnvironment, setIsUserscriptEnvironment] = useState(false);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [selectedSiteKey, setSelectedSiteKey] = useState<string | null>(null);
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [htmlAnalyzerContent, setHtmlAnalyzerContent] = useState('');

  // Check if we're in a userscript environment
  useEffect(() => {
    const hasGMFunctions =
      typeof window !== 'undefined' &&
      'GM_getValue' in window &&
      'GM_setValue' in window;

    setIsUserscriptEnvironment(hasGMFunctions);

    if (hasGMFunctions) {
      const savedConfig = window.GM_getValue('chatClapperConfig');
      if (savedConfig) {
        setConfig(savedConfig);
        if (Object.keys(savedConfig.sites).length > 0) {
          setSelectedSiteKey(Object.keys(savedConfig.sites)[0]);
        }
      }
    }
  }, []);

  // Save config to userscript storage
  const saveConfig = (newConfig: Config) => {
    setConfig(newConfig);
    if (isUserscriptEnvironment) {
      // @ts-expect-error - GM functions exist in userscript context
      window.GM_setValue('chatClapperConfig', newConfig);
    }
  };

  // Update global settings
  const updateGlobalSettings = (key: keyof Pick<Config, 'replacementText' | 'delaySeconds'>, value: string | number) => {
    const newConfig = { ...config };
    newConfig[key] = value;
    saveConfig(newConfig);
  };

  // Add a new site
  const addSite = () => {
    if (!newSiteUrl.trim()) return;

    const newConfig = { ...config };
    if (!newConfig.sites[newSiteUrl]) {
      newConfig.sites[newSiteUrl] = {
        label: '',
        users: [],
        selectors: {
          container: '',
          author: '',
          content: ''
        }
      };
      saveConfig(newConfig);
      setSelectedSiteKey(newSiteUrl);
      setNewSiteUrl('');
    }
  };

  // Delete selected site
  const deleteSite = () => {
    if (!selectedSiteKey) return;

    const newConfig = { ...config };
    delete newConfig.sites[selectedSiteKey];
    saveConfig(newConfig);

    const siteKeys = Object.keys(newConfig.sites);
    setSelectedSiteKey(siteKeys.length > 0 ? siteKeys[0] : null);
  };

  // Update site settings
  const updateSiteSetting = (key: string, value: string | string[] | Selector) => {
    if (!selectedSiteKey) return;

    const newConfig = { ...config };
    const site = { ...newConfig.sites[selectedSiteKey] };

    // @ts-expect-error - Dynamic property access
    site[key] = value;
    newConfig.sites[selectedSiteKey] = site;

    saveConfig(newConfig);
  };

  // Update site URL pattern (key)
  const updateSiteKey = (newKey: string) => {
    if (!selectedSiteKey || !newKey.trim() || newKey === selectedSiteKey) return;

    const newConfig = { ...config };
    const site = newConfig.sites[selectedSiteKey];

    delete newConfig.sites[selectedSiteKey];
    newConfig.sites[newKey] = site;

    saveConfig(newConfig);
    setSelectedSiteKey(newKey);
  };

  // Add user to selected site
  const addUser = () => {
    if (!selectedSiteKey || !newUserName.trim()) return;

    const newConfig = { ...config };
    const site = { ...newConfig.sites[selectedSiteKey] };

    if (!site.users.includes(newUserName)) {
      site.users = [...site.users, newUserName];
      newConfig.sites[selectedSiteKey] = site;
      saveConfig(newConfig);
      setNewUserName('');
    }
  };

  // Remove user from selected site
  const removeUser = (user: string) => {
    if (!selectedSiteKey) return;

    const newConfig = { ...config };
    const site = { ...newConfig.sites[selectedSiteKey] };

    site.users = site.users.filter(u => u !== user);
    newConfig.sites[selectedSiteKey] = site;

    saveConfig(newConfig);
  };

  // Update selector for selected site
  const updateSelector = (selectorKey: keyof Selector, value: string) => {
    if (!selectedSiteKey) return;

    const newConfig = { ...config };
    const site = { ...newConfig.sites[selectedSiteKey] };
    const selectors = { ...site.selectors };

    selectors[selectorKey] = value;
    site.selectors = selectors;
    newConfig.sites[selectedSiteKey] = site;

    saveConfig(newConfig);
  };

  // Placeholder for HTML analyzer functionality
  const analyzeHtml = () => {
    // In a real implementation, this would parse the HTML and suggest selectors
    alert('HTML analysis would happen here in a real implementation');
  };

  if (!isUserscriptEnvironment) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Userscript Settings Dashboard</h1>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  This dashboard is designed to work within a userscript environment.
                  Please install this as a userscript using Tampermonkey, Greasemonkey, or a similar extension.
                </p>
                <p className="mt-2 text-sm text-yellow-700">
                  Make sure your userscript includes the following metadata:
                </p>
                <pre className="mt-2 bg-gray-800 text-white p-3 rounded text-xs overflow-x-auto">
                  {`// ==UserScript==\n// @name         Chat Clapper Config\n// @namespace    http://tampermonkey.net/\n// @version      0.1\n// @description  Configure settings for the Chat Clapper userscript\n// @author       You\n// @match        *://*/*\n// @grant        GM_getValue\n// @grant        GM_setValue\n// ==/UserScript==`}
                </pre>
              </div>
            </div>
          </div>

          <div className="opacity-50 pointer-events-none">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Dashboard Preview (Non-functional)</h2>
            {/* Rest of the UI is shown but non-interactive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Global Settings</h3>
                {/* Global settings preview */}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Site Management</h3>
                {/* Site management preview */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedSite = selectedSiteKey ? config.sites[selectedSiteKey] : null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Chat Clapper Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Global Settings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-4">Global Settings</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Replacement Text
              </label>
              <input
                type="text"
                value={config.replacementText}
                onChange={(e) => updateGlobalSettings('replacementText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delay Seconds
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={config.delaySeconds}
                onChange={(e) => updateGlobalSettings('delaySeconds', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Site Management */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-4">Site Management</h2>

            <div className="flex mb-4">
              <input
                type="text"
                placeholder="New site URL pattern"
                value={newSiteUrl}
                onChange={(e) => setNewSiteUrl(e.target.value)}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={addSite}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Site
              </label>
              <select
                value={selectedSiteKey || ''}
                onChange={(e) => setSelectedSiteKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="" disabled>Select a site</option>
                {Object.keys(config.sites).map(siteKey => (
                  <option key={siteKey} value={siteKey}>
                    {config.sites[siteKey].label || siteKey}
                  </option>
                ))}
              </select>
            </div>

            {selectedSiteKey && selectedSite && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Pattern</label>
                  <input
                    type="text"
                    value={selectedSiteKey}
                    onChange={(e) => updateSiteKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={selectedSite.label || ''}
                    onChange={(e) => updateSiteSetting('label', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Users</label>
                  <div className="flex mb-2">
                    <input
                      type="text"
                      placeholder="Add user"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={addUser}
                      className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add
                    </button>
                  </div>
                  <ul className="list-disc list-inside">
                    {selectedSite.users.map(user => (
                      <li key={user} className="flex justify-between items-center">
                        <span>{user}</span>
                        <button
                          onClick={() => removeUser(user)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          title="Remove user"
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selectors</label>
                  <div className="mb-2">
                    <label className="block text-xs font-semibold text-gray-600">Container</label>
                    <input
                      type="text"
                      value={selectedSite.selectors.container}
                      onChange={(e) => updateSelector('container', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-semibold text-gray-600">Author</label>
                    <input
                      type="text"
                      value={selectedSite.selectors.author}
                      onChange={(e) => updateSelector('author', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-semibold text-gray-600">Content</label>
                    <input
                      type="text"
                      value={selectedSite.selectors.content}
                      onChange={(e) => updateSelector('content', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">HTML Analyzer (Placeholder)</label>
                    <textarea
                      rows={4}
                      value={htmlAnalyzerContent}
                      onChange={(e) => setHtmlAnalyzerContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Paste HTML here to analyze selectors"
                    />
                    <button
                      onClick={analyzeHtml}
                      className="mt-2 px-4 py-2 bg-gray-400 text-white font-medium rounded-md cursor-not-allowed"
                      disabled
                      title="Not implemented"
                    >
                      Analyze HTML
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => saveConfig(config)}
                    className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserscriptSettingsDashboard;
