-- delete_keys.lua
local cursor = ARGV[1]
local count = ARGV[2]
local scanResult = redis.call('SCAN', cursor, 'COUNT', count)
local keys = scanResult[2]
local keysToDelete = {}
for _, key in ipairs(keys) do
    if not string.match(key, '^github:') then
        table.insert(keysToDelete, key)
    end
end
if #keysToDelete > 0 then
    redis.call('DEL', unpack(keysToDelete))
end
return scanResult[1]  -- Return the next cursor
