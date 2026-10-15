import SearchInput from "./SearchInput";

const SearchHeader = ({
    query = "",
    onChange,
    onClear,
    isSearching = false,
}) => {
    return (
        <header className="sticky top-0 z-20 w-full h-13 px-3 md:px-4 flex items-center backdrop-blur-md bg-white/85 dark:bg-[#101010]/85 border-b border-neutral-200/60 dark:border-neutral-800/80 transition-colors duration-200 select-none">
            <SearchInput
                value={query}
                onChange={onChange}
                onClear={onClear}
                isSearching={isSearching}
            />
        </header>
    );
};

export default SearchHeader;
