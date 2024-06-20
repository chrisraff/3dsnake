const localStorage = window.localStorage;
const prefix = '3dsnake/';

function storageGetItem(key, defaultValue)
{
    if (localStorage == undefined)
        return defaultValue;

    var result = localStorage.getItem(prefix + key);
    if (result !== null)
    {
        return result;
    }
    return defaultValue;
}

function storageSetItem(key, value)
{
    if (localStorage == undefined)
        return;

    return localStorage.setItem(prefix + key, value);
}

export {storageGetItem, storageSetItem}
