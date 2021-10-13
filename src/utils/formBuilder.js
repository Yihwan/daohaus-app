import { filterObject, isObjectEmpty } from './general';
import { logFormError } from './errorLog';

export const splitTX = (key, value) => {
  const splitKey = key.split('*');
};
export const splitMulti = (key, value, flag) => {
  const splitKey = key.split(flag);
  return { key: splitKey[0], value, order: splitKey[1] };
};

export const collapseToObjOfArrays = (multis, flag) => {
  const newObj = {};
  for (const multi in multis) {
    const data = splitMulti(multi, multis[multi], flag);
    if (data.value) {
      if (newObj[data.key]) {
        newObj[data.key][data.order] = data.value;
      } else {
        newObj[data.key] = [data.value];
      }
    }
  }
  return newObj;
};

export const collapse = (values, flag, collapseType) => {
  const groupedItems = filterObject(
    values,
    (value, key) => key.includes(flag) && value,
  );

  if (isObjectEmpty(groupedItems)) return values;
  const nonGrouped = filterObject(
    values,
    (value, key) => !key.includes(flag) && value,
  );
  if (collapseType === 'objOfArrays') {
    return { ...collapseToObjOfArrays(groupedItems, flag), ...nonGrouped };
  }
  const orderedArray = Object.entries(groupedItems)
    .map(([key, value]) => splitMulti(key, value, flag))
    .sort((a, b) => a.order - b.order)
    .map(obj => obj.value);

  if (collapseType === 'singleField') {
    return { [flag]: orderedArray, ...nonGrouped };
  }
  if (collapseType === 'array') {
    return orderedArray;
  }
  throw new Error('did not recieve collapseType');
};

export const mapInRequired = (fields, required) => {
  if (!required?.length || !fields) return fields;
  // go through each sub array to
  // REVIEW

  const mapIn = field =>
    Array.isArray(field)
      ? field.map(mapIn)
      : required.includes(field.name)
      ? { ...field, required: true }
      : field;
  const res = fields.map(mapIn);

  return res;
};

export const inputDataFromABI = (inputs, serialTag) => {
  const getType = type => {
    if (type === 'string' || type === 'address') {
      return type;
    }
    if (type.includes('int')) {
      return 'integer';
    }
    if (type === 'fixed' || type === 'ufixed') {
      return 'number';
    }
    return 'any';
  };

  const labels = {
    string: 'Enter text here',
    number: 'Numbers only',
    integer: 'uInt 256',
    address: '0x',
    urlNoHttp: 'www.example.fake',
  };

  return inputs.map((input, index) => {
    const localType = getType(input.type);
    const isMulti = input.type.includes('[]');

    const fieldName = serialTag
      ? `${serialTag}${input.name}*ABI_ARG*${index}`
      : `${input.name}*ABI_ARG*${index}`;
    return {
      type: isMulti ? 'multiInput' : 'input',
      label: input.name,
      name: fieldName,
      htmlFor: fieldName,
      placeholder: labels[localType] || input.type,
      expectType: isMulti ? 'any' : getType(localType),
      required: false,
    };
  });
};

export const handleFormError = ({
  contextData,
  formData,
  args,
  values,
  error,
  errorToast,
  loading,
}) => {
  const errMsg = error?.message || '';
  console.error(error);
  loading?.(false);
  logFormError({
    contextData,
    formData,
    args,
    values,
    errMsg,
  });
  errorToast?.({
    title: 'Error Submitting Proposal',
    description: errMsg,
  });
};

export const useFormCondition = ({ value, condition }) => {
  if (typeof value === 'string') return value;
  if (value?.type === 'formCondition' && condition && value?.[condition])
    return value[condition];
};

export const useFormConditions = ({ values = [], condition }) =>
  values.map(val => useFormCondition({ value: val, condition }));

export const checkConditionalTx = ({ tx, condition }) => {
  if (tx?.type === 'formCondition' && tx[condition]) {
    return tx[condition];
  }
  return tx;
};

export const ignoreAwaitStep = next => {
  return typeof next === 'string' ? next : next?.then;
};

export const getTagRegex = tag => new RegExp(`(\\d+\\*${tag}\\*)+`);

const serializeParam = (name, index, tag) => {
  const regex = getTagRegex(tag);
  if (regex.test(name)) {
    return name.replace(regex, `${index}*${tag}*`);
  }
  return `${index}*${tag}*${name}`;
};

export const serializeFields = (fields = [], index, tag) =>
  fields.map(column =>
    column.map(field => ({
      ...field,
      name: serializeParam(field.name, index, tag),
      listenTo: field.listenTo
        ? serializeParam(field.listenTo, index, tag)
        : null,
    })),
  );
