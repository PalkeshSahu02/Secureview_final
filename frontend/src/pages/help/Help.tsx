import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  Users,
  Lock,
  Eye,
  Share2,
  ArrowLeft,
  ExternalLink,
  Search,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Documents',
    question: 'How do I upload a document?',
    answer: 'Navigate to "My Documents" and click the "Upload Document" button. You can drag and drop files or click to browse. Supported formats include PDF, Word, Excel, PowerPoint, and images.',
  },
  {
    category: 'Documents',
    question: 'What file types are supported?',
    answer: 'SecureView supports PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF, TXT, and CSV files. Maximum file size is 100MB.',
  },
  {
    category: 'Sharing',
    question: 'How do I share a document with someone?',
    answer: 'Open the document from your list, click the "Share" button, and enter the email address of the person you want to share with. You can set permissions and expiration dates.',
  },
  {
    category: 'Sharing',
    question: 'Can I revoke access to a shared document?',
    answer: 'Yes! Go to the document\'s details page and click on "Manage Access". From there, you can remove any user\'s access or modify their permissions.',
  },
  {
    category: 'Security',
    question: 'What is the PIN for?',
    answer: 'The 4-digit PIN provides an additional layer of security. Even if someone has your password, they cannot access your account without the PIN. It\'s required every time you log in.',
  },
  {
    category: 'Security',
    question: 'Why does the viewer block screenshots?',
    answer: 'SecureView is designed to protect sensitive documents. Screenshot blocking, watermarks, and other security features help prevent unauthorized distribution of confidential information.',
  },
  {
    category: 'Security',
    question: 'What information is in the watermark?',
    answer: 'Watermarks include the viewer\'s email, timestamp, and approximate location. This helps track the source if a document is leaked through photos or screen recordings.',
  },
  {
    category: 'Account',
    question: 'How do I change my password?',
    answer: 'Go to Settings > Security and click "Change Password". You\'ll need to enter your current password and then your new password twice to confirm.',
  },
  {
    category: 'Account',
    question: 'How do I invite team members?',
    answer: 'If you\'re an admin, go to "Invitations" in the sidebar. Enter the person\'s email and select their role. They\'ll receive an email with instructions to join your organization.',
  },
];

const Help: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = !searchTerm ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Documents': return FileText;
      case 'Sharing': return Share2;
      case 'Security': return Lock;
      case 'Account': return Users;
      default: return HelpCircle;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Help & Support</h1>
              <p className="text-emerald-100">Find answers and get assistance</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 bg-white/95 backdrop-blur-sm text-slate-900 rounded-2xl shadow-xl focus:outline-none focus:ring-4 focus:ring-white/30 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 -mt-8">
          {[
            { icon: Book, title: 'Documentation', desc: 'Complete user guide', color: 'from-blue-500 to-indigo-500' },
            { icon: MessageCircle, title: 'Live Chat', desc: 'Chat with support', color: 'from-emerald-500 to-teal-500' },
            { icon: Mail, title: 'Email Support', desc: 'support@secureview.com', color: 'from-purple-500 to-pink-500' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                className="group bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 text-left hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-r flex items-center justify-center mb-4', item.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
                <ExternalLink className="w-4 h-4 text-slate-400 mt-3 group-hover:text-emerald-500 transition-colors" />
              </button>
            );
          })}
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  activeCategory === cat
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {cat === 'all' ? 'All Topics' : cat}
              </button>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-lg font-semibold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-500">{filteredFAQs.length} articles</p>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredFAQs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No results found</p>
                <p className="text-slate-500 text-sm mt-1">Try different search terms</p>
              </div>
            ) : (
              filteredFAQs.map((faq, index) => {
                const Icon = getCategoryIcon(faq.category);
                const isOpen = openFAQ === index;

                return (
                  <div key={index} className="group">
                    <button
                      onClick={() => setOpenFAQ(isOpen ? null : index)}
                      className="w-full px-6 py-5 flex items-start justify-between text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                          isOpen ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-slate-200'
                        )}>
                          <Icon className={cn('w-5 h-5', isOpen ? 'text-emerald-600' : 'text-slate-500')} />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-emerald-600 mb-1 block">{faq.category}</span>
                          <p className="font-medium text-slate-900">{faq.question}</p>
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pl-20">
                        <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">Still need help?</h3>
              <p className="text-slate-400">Our support team is available 24/7 to assist you</p>
            </div>
            <div className="flex space-x-4">
              <a
                href="mailto:support@secureview.com"
                className="flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email Us
              </a>
              <a
                href="tel:+1-800-SECURE"
                className="flex items-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Us
              </a>
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 mb-2">Security Tip</h4>
                <p className="text-sm text-amber-700">
                  Never share your PIN with anyone. SecureView staff will never ask for your PIN or password.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Privacy Notice</h4>
                <p className="text-sm text-blue-700">
                  All documents are encrypted and watermarked for your protection. Activity is logged for security purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
