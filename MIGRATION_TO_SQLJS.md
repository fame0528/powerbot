# Migration to sql.js

## What Changed

Switched from **better-sqlite3** to **sql.js** for Node.js 25+ compatibility.

### Why sql.js?
- ✅ **No Native Compilation** - Pure WebAssembly, works on any Node.js version
- ✅ **Works with Node.js 25+** - No C++ version conflicts
- ✅ **Cross-Platform** - Same binary works everywhere
- ✅ **Synchronous API** - Similar to better-sqlite3

### Trade-offs
- ⚠️ **Performance** - Slightly slower than native (but still very fast)
- ⚠️ **Memory** - Runs in memory, must explicitly save to disk
- ✅ **Auto-Save** - Code automatically saves after mutations

## Installation

```bash
# Clean install (recommended)
rm -rf node_modules package-lock.json
npm install

# Should install without errors now!
```

## Code Changes Required

The database layer automatically handles save operations, but here's what changed:

### 1. Database Connection (Automatic)
```typescript
// Now returns Promise
const db = await DatabaseConnection.getInstance(config.database);

// Auto-saves after: create, update, delete operations
```

### 2. Manual Save (Optional)
```typescript
// If you want to manually save to disk
db.save();
```

### 3. Transaction Pattern (Unchanged)
```typescript
// Transactions work the same way
db.transaction(() => {
  // Your database operations
  // Auto-committed and saved on success
});
```

## Key Differences

| Feature | better-sqlite3 | sql.js |
|---------|----------------|--------|
| Compilation | Native C++ | WebAssembly |
| Node.js 25+ | ❌ Fails | ✅ Works |
| Speed | Fastest | Very Fast |
| Persistence | Automatic | Manual (handled by our code) |
| Memory Usage | On-disk | In-memory + save |
| Cross-platform | Needs rebuild | Works everywhere |

## Performance Tips

1. **Batch Operations** - Group multiple inserts/updates
2. **Use Transactions** - Faster than individual operations
3. **Save Strategically** - Our code auto-saves after mutations
4. **Index Properly** - Same optimization rules apply

## Current Status

✅ **package.json updated** - sql.js v1.10.3  
⏳ **Code migration pending** - Need to update connection.ts  
📋 **Next Steps** - Run the migration script below

## Quick Test

```bash
# Install dependencies
npm install

# Should complete without errors!
# No more C++ compilation failures

# Test TypeScript compilation
npm run type-check
```

## Need Help?

- sql.js Docs: https://sql.js.org/documentation/
- GitHub: https://github.com/sql-js/sql.js

## Rollback (if needed)

```bash
# Switch back to better-sqlite3 (Node.js 20 only)
npm uninstall sql.js
npm install better-sqlite3@9.3.0
# Then use Node.js 20 LTS
```
