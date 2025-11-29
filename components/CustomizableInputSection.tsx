
import React, { useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useLanguage } from '../i18n/LanguageContext';

interface CustomizableInputSectionProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  defaultItems: string[];
  localStorageKey: string;
  isList?: boolean; // New prop to enable list mode
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
  
  // Logic to parse currently selected items from the text area
  const selectedItems = useMemo(() => {
      if (!value) return [];
      if (isList) {
          // Split by newline, remove empty lines, remove '- ' prefix
          return value.split('\n')
              .map(line => line.trim())
              .filter(line => line.startsWith('- '))
              .map(line => line.substring(2));
      } else {
          return value.split(/[,،]\s*/).filter(Boolean);
      }
  }, [value, isList]);

  const handleItemToggle = (item: string) => {
    const isSelected = selectedItems.includes(item);
    let newArray;
    
    if (isSelected) {
      newArray = selectedItems.filter(i => i !== item);
    } else {
      newArray = [...selectedItems, item];
    }
    
    if (isList) {
        // Join with newlines and prefix with '- '
        onChange(newArray.map(i => `- ${i}`).join('\n'));
    } else {
        onChange(newArray.join('، '));
    }
  };


  const handleAddNewCustomItem = () => {
    const newItem = window.prompt(t('addNewItem'));
    if (newItem && newItem.trim() && !allItems.includes(newItem.trim())) {
      setCustomItems(prev => [...prev, newItem.trim()]);
    }
  };

  return (
    <div>
      <label className="block font-semibold mb-2 text-primary">{title}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          onClick={handleAddNewCustomItem}
          className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 text-sm transition font-semibold"
        >
          + {t('addNewItem')}
        </button>
        {allItems.map(item => {
          const isSelected = selectedItems.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleItemToggle(item)}
              className={`px-3 py-1 rounded-full text-sm transition ${
                isSelected 
                  ? 'bg-sky-200 text-sky-800 font-semibold' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
        className="w-full p-2 border rounded h-32 focus:ring-primary focus:border-primary transition bg-inherit"
      />
    </div>
  );
};

export default CustomizableInputSection;
