// i18n, form // path string tools
const ARRAY_INDEX = /(.*)\[(\d+)\]/;
const IS_NUMBER = /^\d+$/;

export const getAllKeysFromPath = (path: string): Array<string | number> =>
  path.split(".").flatMap((key) => {
    const match = key.match(ARRAY_INDEX);
    return match ? [...getAllKeysFromPath(match[1]), Number(match[2])] : key;
  });

export const ensureKey = (
  obj: Record<string, any>,
  key: string | number,
  nextKey?: string | number,
): void => {
  if (!(key in obj)) {
    obj[key] = IS_NUMBER.test(String(nextKey)) ? [] : {};
  }
};

export const getByPath = (obj: any, path: string): any => {
  const keys = getAllKeysFromPath(path);
  return keys.reduce(
    (result, key) => (result == null ? undefined : result[key]),
    obj,
  );
};

export const setByPath = (obj: any, path: string, value: any): any => {
  const keys = getAllKeysFromPath(path);
  const key = keys[0];
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };

  if (keys.length === 1) {
    if (value === undefined) {
      Array.isArray(newObj)
        ? newObj.splice(Number(key), 1)
        : delete newObj[key];
    } else {
      newObj[key] = value;
    }
    return newObj;
  }

  ensureKey(newObj, key, keys[1]);
  newObj[key] = setByPath(newObj[key], keys.slice(1).join("."), value);
  return newObj;
};
