import React from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useLanguage } from '../i18n/LanguageContext';

interface CustomizableInputSectionProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  defaultItems: string[];
  localStorageKey: string;
}

const CustomizableInputSection: React.FC<CustomizableInputSectionProps> = ({
  title,
  value,
  onChange,
  defaultItems,
  localStorageKey,
}) => {
  const { t } = useLanguage();
  const [customItems, setCustomItems] = useLocalStorage<string[]>(localStorageKey, []);

  const allItems = [...new Set([...defaultItems, ...customItems])];
  const selectedItems = value ? value.split(/[,،]\s*/).filter(Boolean) : [];

  const handleItemToggle = (item: string) => {
    const isSelected = selectedItems.includes(item);
    let newArray;
    if (isSelected) {
      newArray = selectedItems.filter(i => i !== item);
    } else {
      newArray = [...selectedItems, item];
    }
    onChange(newArray.join('، '));
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
        <button
          type="button"
          onClick={handleAddNewCustomItem}
          className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 text-sm transition font-semibold"
        >
          + {t('addNewItem')}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border rounded h-24 focus:ring-primary focus:border-primary transition bg-inherit"
      />
    </div>
  );
};

export default CustomizableInputSection;