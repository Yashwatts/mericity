import React from "react";
import LocationFilter from "./LocationFilter";

const CommunityFilterControls = ({ 
  sortBy,
  setSortBy,
  voteFilter, 
  setVoteFilter,
  locationFilter,
  setLocationFilter,
  onLocationUpdate,
  filteredCount,
  totalCount,
  hasActiveFilters,
  resetFilters 
}) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 lg:p-5 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5 mb-4">
        <div className="flex items-center gap-2 lg:gap-3">
          <i className="fas fa-filter text-blue-600 text-base"></i>
          <span className="font-semibold text-gray-800 text-base lg:text-lg">
            Community Filters
          </span>
        </div>
        
        {/* Sort By */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm text-gray-600 font-medium min-w-max">
            Sort by:
          </label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer 
                      bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      transition-colors min-w-48"
          >
            <option value="latest">🕒 Latest First</option>
            <option value="oldest">🕐 Oldest First</option>
            <option value="most-upvoted">👍 Most Upvoted</option>
            <option value="most-downvoted">👎 Most Downvoted</option>
            <option value="most-discussed">💬 Most Discussed</option>
          </select>
        </div>

        {/* Vote Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm text-gray-600 font-medium min-w-max">
            Votes:
          </label>
          <select 
            value={voteFilter} 
            onChange={(e) => setVoteFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer 
                      bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      transition-colors min-w-48"
          >
            <option value="all">All Complaints</option>
            <option value="upvoted-only">👍 Upvoted Only</option>
            <option value="downvoted-only">👎 Downvoted Only</option>
            <option value="no-votes">⚪ No Votes Yet</option>
          </select>
        </div>

        {/* Location Filter */}
        <div className="flex-1 lg:flex-none">
          <LocationFilter
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            onLocationUpdate={onLocationUpdate}
          />
        </div>
        
        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm bg-red-500 text-white border-none rounded-lg 
                      cursor-pointer transition-all duration-200 font-medium 
                      hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                      whitespace-nowrap"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>
      
      {/* Results Counter */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 
                      pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <i className="fas fa-info-circle text-blue-600"></i>
          <span>
            Showing <strong className="text-gray-800">{filteredCount}</strong> of{' '}
            <strong className="text-gray-800">{totalCount}</strong> community complaints
            {hasActiveFilters && (
              <span className="text-blue-600 font-medium ml-1">(filtered)</span>
            )}
          </span>
        </div>
        
        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <i className="fas fa-thumbs-up text-green-500"></i>
            <span className="hidden sm:inline">Upvoted Posts</span>
            <span className="sm:hidden">Upvoted</span>
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-thumbs-down text-red-500"></i>
            <span className="hidden sm:inline">Downvoted Posts</span>
            <span className="sm:hidden">Downvoted</span>
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-map-marker-alt text-yellow-500"></i>
            <span className="hidden sm:inline">Local Issues</span>
            <span className="sm:hidden">Local</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommunityFilterControls;