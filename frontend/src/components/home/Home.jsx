import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="max-w-4xl text-center">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Medical Chat AI Platform
        </h1>
        <p className="text-xl text-gray-300 mb-2">
          AI-Powered Medical Research Assistant & Chat Platform
        </p>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          Get instant answers from PubMed research, chat with advanced AI models,
          and manage your knowledge base — all in one intelligent platform.
        </p>

        <div className="flex gap-4 justify-center mb-12">
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg transition font-bold text-lg"
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg transition font-bold text-lg"
          >
            Sign In
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl mb-3">🔬</div>
            <h3 className="text-lg font-bold mb-2">Medical Research</h3>
            <p className="text-gray-400 text-sm">
              Access PubMed-verified medical research articles with AI-powered
              query detection and citation formatting.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-bold mb-2">Advanced AI</h3>
            <p className="text-gray-400 text-sm">
              Powered by Google Gemini AI with smart fallback, context
              management, and medical-aware responses.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl mb-3">🔌</div>
            <h3 className="text-lg font-bold mb-2">API & Plugins</h3>
            <p className="text-gray-400 text-sm">
              REST API access, plugin marketplace, AI agent system, and
              enterprise-grade analytics.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-blue-400 font-bold mb-1">Free</p>
            <p className="text-2xl font-bold mb-2">$0</p>
            <p className="text-gray-400 text-sm">25 messages/day, basic AI</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-500 shadow-lg shadow-blue-500/10">
            <p className="text-blue-400 font-bold mb-1">Pro</p>
            <p className="text-2xl font-bold mb-2">$19.99/mo</p>
            <p className="text-gray-400 text-sm">500 messages, API access</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-purple-400 font-bold mb-1">Enterprise</p>
            <p className="text-2xl font-bold mb-2">$99.99/mo</p>
            <p className="text-gray-400 text-sm">Unlimited, admin, agents</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
