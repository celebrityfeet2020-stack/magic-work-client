/**
 * 魔作智控 2.0 - 智能回复配置页面（话术本管理）
 * 
 * v2.1.8 更新：
 * - 添加下单欢迎语功能
 * - 添加随机自动飘公屏功能
 * - 修复话术本数据格式兼容问题
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { scriptAPI, ScriptBook, ScriptPair } from '../api/client';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertTriangle,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  Ban,
  ShoppingCart,
  Radio,
  Percent,
  Clock
} from 'lucide-react';

const ReplyConfigPage: React.FC = () => {
  const { scriptBooks, setScriptBooks, addLog } = useStore();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 当前选中的话术本
  const selectedBook = scriptBooks.find(b => b.id === selectedBookId);

  // 加载话术本列表
  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const books = await scriptAPI.list();
      setScriptBooks(books);
    } catch (error) {
      addLog({ type: 'error', source: '智能回复', message: '加载话术本失败' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  // 删除话术本
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除话术本 "${name}" 吗？`)) return;
    
    try {
      await scriptAPI.delete(id);
      setScriptBooks(scriptBooks.filter(b => b.id !== id));
      if (selectedBookId === id) {
        setSelectedBookId(null);
      }
      addLog({ type: 'success', source: '智能回复', message: `已删除话术本: ${name}` });
    } catch (error) {
      addLog({ type: 'error', source: '智能回复', message: `删除话术本失败: ${name}` });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-magic-text">智能回复配置</h1>
          <p className="text-magic-text-secondary text-sm mt-1">
            配置话术本，系统将通过向量匹配自动回复公屏问题（多平台通用）
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          新建话术本
        </button>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：话术本列表 */}
        <div className="w-64 bg-magic-card rounded-lg border border-magic-border p-4 overflow-y-auto">
          <h3 className="text-magic-text font-medium mb-3">话术本列表</h3>
          
          {isLoading ? (
            <p className="text-magic-text-secondary text-sm">加载中...</p>
          ) : scriptBooks.length === 0 ? (
            <p className="text-magic-text-secondary text-sm">暂无话术本</p>
          ) : (
            <div className="space-y-2">
              {scriptBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedBookId === book.id
                      ? 'bg-magic-primary/20 border border-magic-primary'
                      : 'bg-magic-bg border border-magic-border hover:border-magic-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-magic-text text-sm font-medium truncate">
                      {book.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(book.id, book.name);
                      }}
                      className="text-magic-text-secondary hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-magic-text-secondary text-xs mt-1">
                    {book.pairs.length} 组问答
                    {book.blocked_keywords?.length > 0 && ` · ${book.blocked_keywords.length} 个屏蔽词`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：话术本编辑 */}
        <div className="flex-1 bg-magic-card rounded-lg border border-magic-border p-4 overflow-y-auto">
          {selectedBook ? (
            <ScriptBookEditor 
              book={selectedBook}
              onUpdate={(updated) => {
                setScriptBooks(scriptBooks.map(b => b.id === updated.id ? updated : b));
              }}
              onLog={addLog}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-magic-text-secondary">
              请从左侧选择一个话术本进行编辑
            </div>
          )}
        </div>
      </div>

      {/* 创建话术本弹窗 */}
      {showCreateModal && (
        <CreateBookModal
          existingBooks={scriptBooks}
          onClose={() => setShowCreateModal(false)}
          onCreated={(book) => {
            setScriptBooks([...scriptBooks, book]);
            setSelectedBookId(book.id);
            setShowCreateModal(false);
            addLog({ type: 'success', source: '智能回复', message: `已创建话术本: ${book.name}` });
          }}
        />
      )}
    </div>
  );
};

// 话术本编辑器组件
const ScriptBookEditor: React.FC<{
  book: ScriptBook;
  onUpdate: (book: ScriptBook) => void;
  onLog: (log: { type: 'info' | 'warning' | 'error' | 'success'; source: string; message: string }) => void;
}> = ({ book, onUpdate, onLog }) => {
  const [editedBook, setEditedBook] = useState<ScriptBook>(book);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [similarityWarnings, setSimilarityWarnings] = useState<string[]>([]);
  const [blockKeywordInput, setBlockKeywordInput] = useState('');
  const [blockKeywordError, setBlockKeywordError] = useState('');
  const [orderReplyInput, setOrderReplyInput] = useState('');
  const [autoFloatInput, setAutoFloatInput] = useState('');

  useEffect(() => {
    setEditedBook({
      ...book,
      blocked_keywords: book.blocked_keywords || [],
      order_reply: book.order_reply || {
        enabled: false,
        probability: 50,
        replies: [],
      },
      auto_float: book.auto_float || {
        enabled: false,
        min_interval: 30,
        max_interval: 60,
        messages: [],
      },
    });
  }, [book]);

  // 获取所有问题中的关键词
  const getAllQuestionKeywords = (): string[] => {
    const keywords: string[] = [];
    editedBook.pairs.forEach(pair => {
      const words = pair.question.split(/[\s,，。！？!?、]+/).filter(w => w.length > 0);
      keywords.push(...words);
      if (pair.question.trim()) {
        keywords.push(pair.question.trim());
      }
    });
    return [...new Set(keywords)];
  };

  // 检查屏蔽关键词是否与问题冲突
  const checkBlockKeywordConflict = (keyword: string): string | null => {
    const questionKeywords = getAllQuestionKeywords();
    for (const qk of questionKeywords) {
      if (qk.toLowerCase().includes(keyword.toLowerCase()) || 
          keyword.toLowerCase().includes(qk.toLowerCase())) {
        return `屏蔽词 "${keyword}" 与问题 "${qk}" 冲突，不能同时设置`;
      }
    }
    return null;
  };

  // 添加屏蔽关键词
  const addBlockKeyword = () => {
    const keyword = blockKeywordInput.trim();
    if (!keyword) {
      setBlockKeywordError('请输入屏蔽关键词');
      return;
    }
    if (editedBook.blocked_keywords.includes(keyword)) {
      setBlockKeywordError('该关键词已存在');
      return;
    }
    const conflict = checkBlockKeywordConflict(keyword);
    if (conflict) {
      setBlockKeywordError(conflict);
      return;
    }
    setEditedBook({
      ...editedBook,
      blocked_keywords: [...editedBook.blocked_keywords, keyword],
    });
    setBlockKeywordInput('');
    setBlockKeywordError('');
  };

  // 删除屏蔽关键词
  const removeBlockKeyword = (keyword: string) => {
    setEditedBook({
      ...editedBook,
      blocked_keywords: editedBook.blocked_keywords.filter(k => k !== keyword),
    });
  };

  // 添加下单回复语
  const addOrderReply = () => {
    const reply = orderReplyInput.trim();
    if (!reply) return;
    if (editedBook.order_reply?.replies.includes(reply)) return;
    setEditedBook({
      ...editedBook,
      order_reply: {
        ...editedBook.order_reply!,
        replies: [...editedBook.order_reply!.replies, reply],
      },
    });
    setOrderReplyInput('');
  };

  // 删除下单回复语
  const removeOrderReply = (reply: string) => {
    setEditedBook({
      ...editedBook,
      order_reply: {
        ...editedBook.order_reply!,
        replies: editedBook.order_reply!.replies.filter(r => r !== reply),
      },
    });
  };

  // 添加飘屏消息
  const addAutoFloatMessage = () => {
    const msg = autoFloatInput.trim();
    if (!msg) return;
    if (editedBook.auto_float?.messages.includes(msg)) return;
    setEditedBook({
      ...editedBook,
      auto_float: {
        ...editedBook.auto_float!,
        messages: [...editedBook.auto_float!.messages, msg],
      },
    });
    setAutoFloatInput('');
  };

  // 删除飘屏消息
  const removeAutoFloatMessage = (msg: string) => {
    setEditedBook({
      ...editedBook,
      auto_float: {
        ...editedBook.auto_float!,
        messages: editedBook.auto_float!.messages.filter(m => m !== msg),
      },
    });
  };

  // 检查问题相似度
  const checkSimilarity = (entries: ScriptPair[]) => {
    const warnings: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const q1 = entries[i].question.toLowerCase();
        const q2 = entries[j].question.toLowerCase();
        const words1 = q1.split(/\s+/).filter((w: string) => w.length > 1);
        const words2 = q2.split(/\s+/).filter((w: string) => w.length > 1);
        const common = words1.filter((w: string) => words2.includes(w));
        if (common.length >= 2 || (q1.includes(q2) || q2.includes(q1))) {
          warnings.push(`问题 #${i + 1} 和问题 #${j + 1} 可能相似，建议调整内容以避免匹配混淆`);
        }
      }
    }
    entries.forEach((entry, index) => {
      editedBook.blocked_keywords.forEach(bk => {
        if (entry.question.toLowerCase().includes(bk.toLowerCase())) {
          warnings.push(`问题 #${index + 1} 包含屏蔽词 "${bk}"，可能导致该问题永远不会被回复`);
        }
      });
    });
    setSimilarityWarnings(warnings);
  };


  // 保存话术本
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 使用update方法更新现有话术本，而不是创建新的
      const updated = await scriptAPI.update(editedBook.id, editedBook.name, editedBook.pairs, editedBook.blocked_keywords);
      // 保留本地的order_reply和auto_float配置
      updated.order_reply = editedBook.order_reply;
      updated.auto_float = editedBook.auto_float;
      onUpdate(updated);
      onLog({ type: 'success', source: '智能回复', message: `已保存话术本: ${updated.name}` });
    } catch (error) {
      onLog({ type: 'error', source: '智能回复', message: '保存话术本失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 添加问答组
  const addEntry = () => {
    const newEntry: ScriptPair = {
      question: '',
      answers: [''],
    };
    const newPairs = [...editedBook.pairs, newEntry];
    setEditedBook({ ...editedBook, pairs: newPairs });
    setExpandedEntry(newPairs.length - 1);
  };

  // 删除问答组
  const removeEntry = (index: number) => {
    const newPairs = editedBook.pairs.filter((_: ScriptPair, i: number) => i !== index);
    setEditedBook({ ...editedBook, pairs: newPairs });
    checkSimilarity(newPairs);
  };

  // 更新问题
  const updateQuestion = (index: number, question: string) => {
    const newPairs = [...editedBook.pairs];
    newPairs[index] = { ...newPairs[index], question };
    setEditedBook({ ...editedBook, pairs: newPairs });
    checkSimilarity(newPairs);
  };

  // 添加回答
  const addAnswer = (entryIndex: number) => {
    const newPairs = [...editedBook.pairs];
    newPairs[entryIndex] = {
      ...newPairs[entryIndex],
      answers: [...newPairs[entryIndex].answers, ''],
    };
    setEditedBook({ ...editedBook, pairs: newPairs });
  };

  // 更新回答
  const updateAnswer = (entryIndex: number, answerIndex: number, answer: string) => {
    const newPairs = [...editedBook.pairs];
    const newAnswers = [...newPairs[entryIndex].answers];
    newAnswers[answerIndex] = answer;
    newPairs[entryIndex] = { ...newPairs[entryIndex], answers: newAnswers };
    setEditedBook({ ...editedBook, pairs: newPairs });
  };

  // 删除回答
  const removeAnswer = (entryIndex: number, answerIndex: number) => {
    const newPairs = [...editedBook.pairs];
    const newAnswers = newPairs[entryIndex].answers.filter((_: string, i: number) => i !== answerIndex);
    newPairs[entryIndex] = { ...newPairs[entryIndex], answers: newAnswers };
    setEditedBook({ ...editedBook, pairs: newPairs });
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-magic-text">{editedBook.name}</h2>
          <p className="text-magic-text-secondary text-sm">
            编辑话术本内容，配置自动回复规则
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {/* 下单欢迎语配置 */}
      <div className="bg-magic-bg rounded-lg border border-magic-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-green-400" />
            <h3 className="text-magic-text font-medium">下单欢迎语</h3>
            <span className="text-magic-text-secondary text-xs">
              （检测到下单时自动回复感谢语）
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editedBook.order_reply?.enabled || false}
              onChange={(e) => setEditedBook({
                ...editedBook,
                order_reply: { ...editedBook.order_reply!, enabled: e.target.checked },
              })}
              className="w-4 h-4 rounded border-magic-border text-magic-primary focus:ring-magic-primary"
            />
            <span className="text-magic-text text-sm">启用</span>
          </label>
        </div>

        {editedBook.order_reply?.enabled && (
          <div className="space-y-3">
            {/* 回复概率 */}
            <div className="flex items-center gap-3">
              <Percent size={16} className="text-magic-text-secondary" />
              <span className="text-magic-text text-sm">回复概率:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={editedBook.order_reply?.probability || 50}
                onChange={(e) => setEditedBook({
                  ...editedBook,
                  order_reply: { ...editedBook.order_reply!, probability: parseInt(e.target.value) || 0 },
                })}
                className="w-20 px-2 py-1 bg-magic-card border border-magic-border rounded text-magic-text text-sm focus:outline-none focus:border-magic-primary"
              />
              <span className="text-magic-text-secondary text-sm">%</span>
            </div>

            {/* 添加回复语 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={orderReplyInput}
                onChange={(e) => setOrderReplyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addOrderReply();
                  }
                }}
                placeholder="输入下单回复语后按回车添加..."
                className="flex-1 px-3 py-2 bg-magic-card border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
              />
              <button
                onClick={addOrderReply}
                className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
              >
                添加
              </button>
            </div>

            {/* 回复语列表 */}
            <div className="flex flex-wrap gap-2">
              {(editedBook.order_reply?.replies || []).length === 0 ? (
                <span className="text-magic-text-secondary text-sm">暂无下单回复语，请添加</span>
              ) : (
                (editedBook.order_reply?.replies || []).map((reply, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm"
                  >
                    {reply}
                    <button
                      onClick={() => removeOrderReply(reply)}
                      className="hover:text-green-300"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 自动飘公屏配置 */}
      <div className="bg-magic-bg rounded-lg border border-magic-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-blue-400" />
            <h3 className="text-magic-text font-medium">随机自动飘公屏</h3>
            <span className="text-magic-text-secondary text-xs">
              （按时间间隔随机发送消息到公屏）
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editedBook.auto_float?.enabled || false}
              onChange={(e) => setEditedBook({
                ...editedBook,
                auto_float: { ...editedBook.auto_float!, enabled: e.target.checked },
              })}
              className="w-4 h-4 rounded border-magic-border text-magic-primary focus:ring-magic-primary"
            />
            <span className="text-magic-text text-sm">启用</span>
          </label>
        </div>

        {editedBook.auto_float?.enabled && (
          <div className="space-y-3">
            {/* 时间间隔 */}
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-magic-text-secondary" />
              <span className="text-magic-text text-sm">发送间隔:</span>
              <input
                type="number"
                min="5"
                max="3600"
                value={editedBook.auto_float?.min_interval || 30}
                onChange={(e) => setEditedBook({
                  ...editedBook,
                  auto_float: { ...editedBook.auto_float!, min_interval: parseInt(e.target.value) || 30 },
                })}
                className="w-20 px-2 py-1 bg-magic-card border border-magic-border rounded text-magic-text text-sm focus:outline-none focus:border-magic-primary"
              />
              <span className="text-magic-text-secondary text-sm">~</span>
              <input
                type="number"
                min="5"
                max="3600"
                value={editedBook.auto_float?.max_interval || 60}
                onChange={(e) => setEditedBook({
                  ...editedBook,
                  auto_float: { ...editedBook.auto_float!, max_interval: parseInt(e.target.value) || 60 },
                })}
                className="w-20 px-2 py-1 bg-magic-card border border-magic-border rounded text-magic-text text-sm focus:outline-none focus:border-magic-primary"
              />
              <span className="text-magic-text-secondary text-sm">秒</span>
            </div>

            {/* 添加飘屏消息 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={autoFloatInput}
                onChange={(e) => setAutoFloatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAutoFloatMessage();
                  }
                }}
                placeholder="输入飘屏消息后按回车添加..."
                className="flex-1 px-3 py-2 bg-magic-card border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
              />
              <button
                onClick={addAutoFloatMessage}
                className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
              >
                添加
              </button>
            </div>

            {/* 飘屏消息列表 */}
            <div className="flex flex-wrap gap-2">
              {(editedBook.auto_float?.messages || []).length === 0 ? (
                <span className="text-magic-text-secondary text-sm">暂无飘屏消息，请添加</span>
              ) : (
                (editedBook.auto_float?.messages || []).map((msg, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm"
                  >
                    {msg}
                    <button
                      onClick={() => removeAutoFloatMessage(msg)}
                      className="hover:text-blue-300"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 屏蔽关键词配置 */}
      <div className="bg-magic-bg rounded-lg border border-magic-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Ban size={18} className="text-red-400" />
          <h3 className="text-magic-text font-medium">屏蔽关键词</h3>
          <span className="text-magic-text-secondary text-xs">
            （包含这些词的弹幕不会触发自动回复，例如主播名字）
          </span>
        </div>
        
        {/* 添加屏蔽词 */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={blockKeywordInput}
            onChange={(e) => {
              setBlockKeywordInput(e.target.value);
              setBlockKeywordError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addBlockKeyword();
              }
            }}
            placeholder="输入屏蔽关键词后按回车添加..."
            className="flex-1 px-3 py-2 bg-magic-card border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
          />
          <button
            onClick={addBlockKeyword}
            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
          >
            添加
          </button>
        </div>
        
        {blockKeywordError && (
          <p className="text-red-400 text-sm mb-2">{blockKeywordError}</p>
        )}
        
        {/* 屏蔽词列表 */}
        <div className="flex flex-wrap gap-2">
          {editedBook.blocked_keywords.length === 0 ? (
            <span className="text-magic-text-secondary text-sm">暂无屏蔽关键词</span>
          ) : (
            editedBook.blocked_keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeBlockKeyword(keyword)}
                  className="hover:text-red-300"
                >
                  <X size={14} />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 相似度警告 */}
      {similarityWarnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertTriangle size={18} />
            <span className="font-medium">问题相似度警告</span>
          </div>
          <ul className="text-yellow-400/80 text-sm space-y-1">
            {similarityWarnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 说明 */}
      <div className="bg-magic-bg rounded-lg p-4 text-sm text-magic-text-secondary">
        <p>• 每组包含1个问题（左边）和多个回答（右边），系统会随机选择一个回答</p>
        <p>• 系统通过向量匹配检测用户问题，匹配成功则自动回复，否则保持沉默</p>
        <p>• <span className="text-green-400">下单欢迎语</span>：检测到下单时按概率随机发送一条感谢语</p>
        <p>• <span className="text-blue-400">随机飘公屏</span>：按设定的时间间隔随机发送消息到公屏</p>
        <p>• <span className="text-red-400">屏蔽关键词</span>与问题关键词不能重复，避免冲突</p>
      </div>

      {/* 问答组列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-magic-text font-medium">问答组配置</h3>
          <button
            onClick={addEntry}
            className="text-sm text-magic-primary hover:text-magic-primary/80"
          >
            + 添加问答组
          </button>
        </div>

        <div className="space-y-4">
          {editedBook.pairs.map((entry: ScriptPair, entryIndex: number) => (
            <div 
              key={entryIndex}
              className="bg-magic-bg rounded-lg border border-magic-border"
            >
              {/* 问答组头部 */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedEntry(expandedEntry === entryIndex ? null : entryIndex)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-magic-primary font-bold">#{entryIndex + 1}</span>
                  <span className="text-magic-text truncate max-w-md">
                    {entry.question || '未设置问题'}
                  </span>
                  <span className="text-magic-text-secondary text-sm">
                    ({entry.answers.length} 个回答)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(entryIndex);
                    }}
                    className="text-magic-text-secondary hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  {expandedEntry === entryIndex ? (
                    <ChevronUp size={18} className="text-magic-text-secondary" />
                  ) : (
                    <ChevronDown size={18} className="text-magic-text-secondary" />
                  )}
                </div>
              </div>

              {/* 问答组内容 */}
              {expandedEntry === entryIndex && (
                <div className="px-4 pb-4 border-t border-magic-border pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* 左侧：问题 */}
                    <div>
                      <label className="block text-magic-text-secondary text-sm mb-2">
                        问题（用户可能问的内容）
                      </label>
                      <textarea
                        value={entry.question}
                        onChange={(e) => updateQuestion(entryIndex, e.target.value)}
                        placeholder="例如：这个多少钱？"
                        rows={3}
                        className="w-full px-3 py-2 bg-magic-card border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary resize-none"
                      />
                    </div>

                    {/* 右侧：回答列表 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-magic-text-secondary text-sm">
                          回答（随机选择一个）
                        </label>
                        <button
                          onClick={() => addAnswer(entryIndex)}
                          className="text-xs text-magic-primary hover:text-magic-primary/80"
                        >
                          + 添加回答
                        </button>
                      </div>
                      <div className="space-y-2">
                        {entry.answers.map((answer: string, answerIndex: number) => (
                          <div key={answerIndex} className="flex items-start gap-2">
                            <textarea
                              value={answer}
                              onChange={(e) => updateAnswer(entryIndex, answerIndex, e.target.value)}
                              placeholder={`回答 ${answerIndex + 1}`}
                              rows={2}
                              className="flex-1 px-3 py-2 bg-magic-card border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary resize-none"
                            />
                            {entry.answers.length > 1 && (
                              <button
                                onClick={() => removeAnswer(entryIndex, answerIndex)}
                                className="text-magic-text-secondary hover:text-red-400 transition-colors mt-2"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editedBook.pairs.length === 0 && (
            <div className="text-center py-8 text-magic-text-secondary">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
              <p>暂无问答组，点击上方"添加问答组"开始配置</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 创建话术本弹窗
const CreateBookModal: React.FC<{
  existingBooks: ScriptBook[];
  onClose: () => void;
  onCreated: (book: ScriptBook) => void;
}> = ({ existingBooks, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('请输入话术本名称');
      return;
    }

    if (existingBooks.some(b => b.name === name.trim())) {
      setError('话术本名称已存在');
      return;
    }

    setIsCreating(true);
    try {
      const book = await scriptAPI.create(name.trim(), [], []);
      onCreated(book);
    } catch (error) {
      setError('创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-magic-card rounded-lg border border-magic-border p-6 w-96">
        <h3 className="text-lg font-bold text-magic-text mb-4">新建话术本</h3>
        
        <div className="mb-4">
          <label className="block text-magic-text-secondary text-sm mb-2">
            话术本名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="例如：产品价格话术本"
            className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-magic-text-secondary hover:text-magic-text transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors disabled:opacity-50"
          >
            {isCreating ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplyConfigPage;
