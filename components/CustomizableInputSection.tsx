
import React, { useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useLanguage } from '../i18n/LanguageContext';

interface CustomizableInputSectionProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  defaultItems: string[];
  localStorageKey: string;
  isList?: boolean; 
}

const CustomizableInputSection: React.FC<CustomizableInputSectionProps> = ({
  title,
  value,
  onChange,
  defaultItems,
  localStorageKey,
  isList = false,
}) => {
  const { t } = useLanguage();
  const [customItems, setCustomItems] = useLocalStorage<string[]>(localStorageKey, []);

  const allItems = [...new Set([...defaultItems, ...customItems])];
  
  const selectedItems = useMemo(() => {
      if (!value) return [];
      // تنظيف النص لمعرفة العناصر المختارة
      return allItems.filter(item => value.includes(item));
  }, [value, allItems]);

  const handleItemToggle = (item: string) => {
    let currentArray = isList 
        ? value.split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean)
        : value.split(/[,،]\s*/).filter(Boolean);

    const isSelected = currentArray.includes(item);
    let newArray;
    
    if (isSelected) {
      newArray = currentArray.filter(i => i !== item);
    } else {
      newArray = [...currentArray, item];
    }
    
    if (isList) {
        onChange(newArray.map(i => `- ${i}`).join('\n'));
    } else {
        onChange(newArray.join(' ، '));
    }
  };

  const handleAddNewCustomItem = () => {
    const newItem = window.prompt(t('addNewItem'));
    if (newItem && newItem.trim() && !allItems.includes(newItem.trim())) {
      setCustomItems(prev => [...prev, newItem.trim()]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg">
        <label className="block font-bold text-primary text-sm">{title}</label>
        <button
          type="button"
          onClick={handleAddNewCustomItem}
          className="px-3 py-1 bg-white text-primary border border-primary/20 rounded-full text-[10px] font-bold shadow-sm hover:bg-primary hover:text-white transition-all"
        >
          + إضافة عنصر جديد
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-hide">
        {allItems.map(item => {
          const isSelected = selectedItems.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleItemToggle(item)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                isSelected 
                  ? 'bg-primary text-white scale-105 ring-2 ring-primary/20' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item}
            </button>
          )
        })}
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border-2 border-gray-100 rounded-xl h-24 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm leading-relaxed"
        placeholder={`اكتب هنا أو اختر من الأعلى...`}
      />
    </div>
  );
};

export default CustomizableInputSection;
