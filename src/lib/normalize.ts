const NORMALIZE_RE = /(\W)([bｂdｄgｇhｈkｋmｍnｎpｐrｒsｓtｔwｗyｙzｚ])($|\s)/g

const normalize = (value: string): string =>
  value.replace(NORMALIZE_RE, (_, ...args): string => args[0] + args[2])

export default normalize
