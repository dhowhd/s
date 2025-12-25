'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { countries, generatePhoneNumber, searchCountries, type CountryData } from '@/lib/phoneData';
import { NavigationMenu, MenuButton } from '@/components/NavigationMenu';

// 图标组件
const ICON_PATHS: Record<string, React.ReactElement> = {
  check: <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>,
  close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>,
  search: <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>,
  download: <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>,
  copy: <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>,
  sparkles: <path d="M7 11v2l-4 1 4 1v2l1-4-1-4zm5-7v4l-3 1 3 1v4l2-5-2-5zm5.66 2.94L15 6.26l.66-2.94L18.34 6l2.66.68-2.66.68-.68 2.58-.66-2.94zM15 18l-2-3 2-3 2 3-2 3z"/>,
  chevronRight: <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>,
  globe: <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
};

const Icon = memo(({ name, className = "w-6 h-6" }: { name: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">{ICON_PATHS[name]}</svg>
));
Icon.displayName = 'Icon';

const haptic = (duration: number = 15) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(duration);
  }
};

// localStorage keys
const STORAGE_KEY_COUNTRY = 'phone_generator_selected_country';
const STORAGE_KEY_COUNT = 'phone_generator_count';

// 国家选择界面
interface CountrySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: CountryData) => void;
  currentCountry: CountryData | null;
}

const CountrySelector = memo(({ isOpen, onClose, onSelect, currentCountry }: CountrySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0);
    }, 200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchQuery]);

  const filteredCountries = useMemo(() => {
    return searchCountries(debouncedQuery);
  }, [debouncedQuery]);

  const paginatedCountries = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return filteredCountries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCountries, page]);

  const totalPages = Math.ceil(filteredCountries.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setPage(0);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* 头部 */}
        <div className="shrink-0 pt-safe px-4 pb-4">
          <div className="h-[52px] flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-white tracking-tight drop-shadow-md">
              选择国家/地区
            </h2>
            <button
              onClick={() => { haptic(20); onClose(); }}
              className="p-2 rounded-full bg-black/30 border border-white/20 active:bg-white/20 transition-all active:scale-95 touch-manipulation"
            >
              <Icon name="close" className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="search" className="w-5 h-5 text-white/40" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索国家或区号..."
              className="w-full pl-10 pr-10 py-3 bg-black/30 border border-white/20 rounded-[16px] text-[16px] text-white placeholder-white/40 focus:ring-2 focus:ring-white/30 focus:bg-black/40 transition-colors caret-[#007AFF] outline-none shadow-xl"
            />
            {searchQuery && (
              <button
                onClick={() => { haptic(20); setSearchQuery(''); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation active:scale-90 transition-transform"
              >
                <div className="bg-white/20 rounded-full p-1">
                  <Icon name="close" className="w-3.5 h-3.5 text-white" />
                </div>
              </button>
            )}
          </div>

          <div className="text-white/60 text-[13px] mt-2">
            找到 {filteredCountries.length} 个国家
          </div>
        </div>

        {/* 国家列表 */}
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          <div className="space-y-2">
            {paginatedCountries.map((country) => (
              <button
                key={country.id}
                onClick={() => {
                  haptic(30);
                  onSelect(country);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-4 rounded-[16px] transition-all duration-200 active:scale-[0.98] touch-manipulation border ${
                  currentCountry?.id === country.id
                    ? 'bg-white/10 border-white/20 shadow-lg'
                    : 'bg-black/30 border-white/10 active:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0 w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#0055b3] rounded-full flex items-center justify-center shadow-lg">
                    <Icon name="globe" className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-white font-semibold text-[16px] tracking-tight truncate">
                      {country.name}
                    </div>
                    <div className="text-white/60 text-[14px]">
                      {country.code}
                    </div>
                  </div>
                </div>
                {currentCountry?.id === country.id && (
                  <Icon name="check" className="w-5 h-5 text-[#34C759] shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-6">
              <button
                onClick={() => { haptic(20); setPage(p => Math.max(0, p - 1)); }}
                disabled={page === 0}
                className="px-4 py-2 bg-black/30 border border-white/20 rounded-[12px] text-white text-[14px] font-medium disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
              >
                上一页
              </button>
              <span className="text-white/60 text-[14px]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => { haptic(20); setPage(p => Math.min(totalPages - 1, p + 1)); }}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 bg-black/30 border border-white/20 rounded-[12px] text-white text-[14px] font-medium disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
CountrySelector.displayName = 'CountrySelector';

// 主页面
export default function PhoneGeneratorPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [count, setCount] = useState<number>(10);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // 从localStorage加载设置
  useEffect(() => {
    try {
      const savedCountryId = localStorage.getItem(STORAGE_KEY_COUNTRY);
      const savedCount = localStorage.getItem(STORAGE_KEY_COUNT);

      if (savedCountryId) {
        const country = countries.find(c => c.id === savedCountryId);
        if (country) {
          setSelectedCountry(country);
        } else {
          setSelectedCountry(countries[0]);
        }
      } else {
        setSelectedCountry(countries[0]);
      }

      if (savedCount) {
        const parsedCount = parseInt(savedCount, 10);
        if (parsedCount > 0 && parsedCount <= 10000) {
          setCount(parsedCount);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSelectedCountry(countries[0]);
    }
  }, []);

  const handleSelectCountry = useCallback((country: CountryData) => {
    setSelectedCountry(country);
    setGeneratedNumbers([]);
    setPage(0);
    try {
      localStorage.setItem(STORAGE_KEY_COUNTRY, country.id);
    } catch (error) {
      console.error('Failed to save country:', error);
    }
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedCountry) return;
    haptic(50);

    const numbers = generatePhoneNumber(selectedCountry, count);
    setGeneratedNumbers(numbers);
    setPage(0);

    try {
      localStorage.setItem(STORAGE_KEY_COUNT, count.toString());
    } catch (error) {
      console.error('Failed to save count:', error);
    }
  }, [selectedCountry, count]);

  const handleCopy = useCallback(async (text: string, index: number) => {
    haptic(30);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (error) {
      console.error('Copy failed:', error);
      haptic(50);
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    haptic(30);
    try {
      const text = generatedNumbers.join('\n');
      await navigator.clipboard.writeText(text);
      setIsCopiedAll(true);
      setTimeout(() => setIsCopiedAll(false), 1500);
    } catch (error) {
      console.error('Copy all failed:', error);
      haptic(50);
    }
  }, [generatedNumbers]);

  const handleDownload = useCallback(() => {
    haptic(30);
    if (generatedNumbers.length === 0) return;

    const text = generatedNumbers.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    a.download = `${selectedCountry?.name || 'phone'}_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedNumbers, selectedCountry]);

  const paginatedNumbers = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return generatedNumbers.slice(start, start + ITEMS_PER_PAGE);
  }, [generatedNumbers, page]);

  const totalPages = Math.ceil(generatedNumbers.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen relative font-sans text-white pb-10 selection:bg-blue-400/30 overflow-x-hidden">
      <div className="relative z-10">
        {/* 头部 */}
        <header className="fixed top-0 left-0 right-0 h-[52px] z-40 flex items-center justify-between px-4 pt-2 transition-all duration-300">
          <h1 className="text-[17px] font-semibold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            手机号生成器
          </h1>
          <MenuButton onClick={() => { haptic(20); setShowMenu(true); }} />
        </header>

        {/* 主内容 */}
        <main className="max-w-[420px] mx-auto px-5 pt-20 pb-10 space-y-6">
          {/* 国家选择卡片 */}
          <section className="bg-black/30 rounded-[20px] border border-white/20 shadow-xl overflow-hidden">
            <button
              onClick={() => { haptic(20); setShowCountrySelector(true); }}
              className="w-full p-4 flex items-center justify-between active:bg-white/15 transition-all duration-200 touch-manipulation"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-[#007AFF] to-[#0055b3] rounded-full flex items-center justify-center shadow-lg">
                  <Icon name="globe" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-white/70 text-[13px] mb-0.5">当前地区</div>
                  <div className="text-white font-bold text-[17px] tracking-tight truncate drop-shadow-md">
                    {selectedCountry?.name || '选择国家'}
                  </div>
                  <div className="text-white/80 text-[14px]">
                    {selectedCountry?.code || ''}
                  </div>
                </div>
              </div>
              <Icon name="chevronRight" className="w-5 h-5 text-white/70 shrink-0" />
            </button>
          </section>

          {/* 生成设置 */}
          <section className="bg-black/30 rounded-[20px] border border-white/20 shadow-xl p-4 space-y-4">
            <div>
              <label className="text-white/80 text-[14px] font-medium mb-2 block">
                生成数量
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val > 0 && val <= 10000) setCount(val);
                }}
                min="1"
                max="10000"
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-[14px] text-white text-[16px] focus:ring-2 focus:ring-white/30 outline-none transition-colors"
              />
              <div className="text-white/60 text-[12px] mt-1.5">
                最多支持生成 10000 个号码
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedCountry}
              className="w-full py-4 rounded-[18px] bg-gradient-to-b from-[#007AFF]/90 to-[#0055b3]/90 shadow-[0_0_20px_rgba(0,122,255,0.4)] border border-white/20 flex items-center justify-center gap-2.5 touch-manipulation transition-all duration-200 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="sparkles" className="w-5 h-5 text-white/90 drop-shadow-sm" />
              <span className="text-[17px] font-semibold tracking-tight text-white drop-shadow-md">
                生成号码
              </span>
            </button>
          </section>

          {/* 生成结果 */}
          {generatedNumbers.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-[16px] drop-shadow-md">
                  生成结果 ({generatedNumbers.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAll}
                    className="p-2 bg-black/30 border border-white/20 rounded-[12px] active:bg-white/20 transition-all active:scale-95 touch-manipulation relative overflow-hidden"
                  >
                    <div className={`transition-all duration-300 ${isCopiedAll ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                      <Icon name="copy" className="w-5 h-5 text-white/80" />
                    </div>
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isCopiedAll ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                      <Icon name="check" className="w-5 h-5 text-[#34C759]" />
                    </div>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 bg-black/30 border border-white/20 rounded-[12px] active:bg-white/20 transition-all active:scale-95 touch-manipulation"
                  >
                    <Icon name="download" className="w-5 h-5 text-white/80" />
                  </button>
                </div>
              </div>

              <div className="bg-black/30 rounded-[20px] border border-white/20 shadow-xl overflow-hidden">
                <div className="divide-y divide-white/10">
                  {paginatedNumbers.map((number, idx) => {
                    const actualIndex = page * ITEMS_PER_PAGE + idx;
                    const isCopied = copiedIndex === actualIndex;
                    return (
                      <button
                        key={actualIndex}
                        onClick={() => handleCopy(number, actualIndex)}
                        className="w-full px-4 py-3 flex items-center justify-between active:bg-white/15 transition-all touch-manipulation"
                      >
                        <span className="text-white font-mono text-[15px] truncate">
                          {number}
                        </span>
                        <div className="relative w-5 h-5 ml-3 shrink-0">
                          <div className={`absolute inset-0 transition-all duration-300 ${isCopied ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                            <Icon name="copy" className="w-5 h-5 text-white/60" />
                          </div>
                          <div className={`absolute inset-0 transition-all duration-300 ${isCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                            <Icon name="check" className="w-5 h-5 text-[#34C759]" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 分页控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => { haptic(20); setPage(p => Math.max(0, p - 1)); }}
                    disabled={page === 0}
                    className="px-4 py-2 bg-black/30 border border-white/20 rounded-[12px] text-white text-[14px] font-medium disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
                  >
                    上一页
                  </button>
                  <span className="text-white/60 text-[14px]">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => { haptic(20); setPage(p => Math.min(totalPages - 1, p + 1)); }}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 bg-black/30 border border-white/20 rounded-[12px] text-white text-[14px] font-medium disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
                  >
                    下一页
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 页脚 */}
          <footer className="pt-4 text-center space-y-3">
            <p className="text-[12px] text-white/60 tracking-tight drop-shadow-md">
              支持 {countries.length} 个国家/地区
            </p>
            <p className="text-[11px] text-white/50">
              生成的号码仅供测试使用
            </p>
          </footer>
        </main>
      </div>

      {/* 国家选择界面 */}
      <CountrySelector
        isOpen={showCountrySelector}
        onClose={() => setShowCountrySelector(false)}
        onSelect={handleSelectCountry}
        currentCountry={selectedCountry}
      />

      {/* 导航菜单 */}
      <NavigationMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
    </div>
  );
}