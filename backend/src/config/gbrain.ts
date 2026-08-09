const GBRAIN_HOME =
  process.env.GBRAIN_HOME ??
  `${process.cwd()}/.gbrain`;

export function getGBrainConfig() {
  return {
    home: GBRAIN_HOME,
  };
}