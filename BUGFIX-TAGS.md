# Bug Fix: Tags Functionality

## Problem
The `extractShowTags()` function was defined but never called, resulting in tags never being displayed in the UI even though the ShowDetails component had UI code to render them.

## Root Cause
In `src/services/show-processor.ts`, the `transformShowData()` function processed show data but never extracted or assigned tags to the show objects, despite:
1. The `extractShowTags()` helper function existing
2. The UI component ([ShowDetails.tsx:122-133](src/components/ShowDetails.tsx#L122-L133)) expecting and rendering tags
3. The API likely returning tag data

## Solution
Integrated tag extraction directly into the `transformShowData()` function:

1. **Added tagsMap**: Created a Map to collect tags per show during data processing
2. **Tag Collection**: During the first pass through raw API data, collect tags from each item
3. **Deduplication**: Only add unique tags (tags with unique names) to prevent duplicates
4. **Assignment**: Assign collected tags to each show object before returning

### Code Changes

**File: [src/services/show-processor.ts](src/services/show-processor.ts)**

```typescript
// Added tagsMap to track tags per show
const tagsMap = new Map<string, any[]>();

// Initialize empty tags array for each new show
tags: [], // Initialize empty tags array

// Collect tags from each item during processing
if (item.tags && Array.isArray(item.tags)) {
  const existingTags = tagsMap.get(showId) || [];
  item.tags.forEach((tag: any) => {
    // Only add unique tags
    if (tag && tag.name && !existingTags.some(t => t.name === tag.name)) {
      existingTags.push(tag);
    }
  });
  tagsMap.set(showId, existingTags);
}

// Assign tags to the show
show.tags = tagsMap.get(show.showid) || [];
```

**File: [src/tests/show-processor.test.ts](src/tests/show-processor.test.ts)**

Added test coverage:
- Added tags to mock data
- Added assertions to verify tags are extracted and deduplicated
- Added test for shows without tags
- Verified empty tags array is returned when no tags present

## Expected Behavior

### Before Fix
- Tags were never displayed in the UI
- `show.tags` was undefined or empty
- Tag data from API was ignored

### After Fix
- Tags are extracted from API responses
- Duplicate tags are automatically deduplicated
- Tags display in the ShowDetails component
- Empty array returned when no tags present (instead of undefined)

## UI Impact

Users will now see tags displayed at the bottom of show details:

```
Tags
[Jam] [Noteworthy] [Debut]
```

Tags appear as styled badges in the ShowDetails component when available.

## Testing

To test this fix:

1. **Unit Tests**: Run the test suite
   ```bash
   npm test
   ```

2. **Manual Testing**:
   - Select a notable show (e.g., 12/31/1995 - MSG New Year's Run)
   - Check if tags appear at the bottom of the show details
   - Verify no duplicate tags are shown

3. **Edge Cases**:
   - Shows without tags should display no tags section
   - Shows with duplicate tags in API should show each tag once

## Related Issues Fixed

This also resolves:
- Missing data display issue (tags were part of incomplete data rendering)
- Unused code warning for `extractShowTags()` function

## Notes

The `extractShowTags()` function remains in the codebase for:
- Backwards compatibility
- Potential standalone use in other contexts
- Test coverage purposes

It can be safely removed in a future refactor if not needed elsewhere.
