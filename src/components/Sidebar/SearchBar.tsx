import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';

export const SearchBar = memo(function SearchBar() {
    const { filter, setFilter } = useChannelStore();
    const [localValue, setLocalValue] = useState(filter.search);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setLocalValue(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setFilter({ search: value });
            }, 150);
        },
        [setFilter],
    );

    const handleClear = useCallback(() => {
        setLocalValue('');
        setFilter({ search: '' });
        inputRef.current?.focus();
    }, [setFilter]);

    useEffect(() => {
        if (filter.search === '' && localValue !== '') setLocalValue('');
    }, [filter.search]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{ position: 'relative' }}>
            <Search
                size={14}
                style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                    transition: 'color 0.2s',
                }}
            />
            <input
                ref={inputRef}
                id="channel-search"
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder="Kanal ara... (Ctrl+F)"
                className="search-glass"
                style={{ width: '100%', paddingLeft: 34 }}
            />
            {localValue && (
                <button
                    onClick={handleClear}
                    style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: 2,
                    }}
                >
                    <X size={13} />
                </button>
            )}
        </div>
    );
});
