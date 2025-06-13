import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Database, Microscope, BarChart3, Home } from 'lucide-react';
import { useStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { activeView, setActiveView } = useStore();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, view: 'dataset' as const },
    { name: 'Dataset', href: '/dataset', icon: Database, view: 'dataset' as const },
    { name: 'Model', href: '/model', icon: Brain, view: 'model' as const },
    { name: 'Experiment', href: '/experiment', icon: Microscope, view: 'experiment' as const },
    { name: 'Results', href: '/results', icon: BarChart3, view: 'results' as const },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Brain className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Probity Studio</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setActiveView(item.view)}
                      className={`
                        inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium
                        ${isActive 
                          ? 'border-indigo-500 text-gray-900' 
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
                New Experiment
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};