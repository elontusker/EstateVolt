export const ELECTRICITY_METERS_STORAGE_KEY = 'rently_electricity_meters_v1';
export const DEFAULT_ELECTRICITY_METERS = ['Meter 1', 'Meter 2'];

export const loadElectricityMeters = (): string[] => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(ELECTRICITY_METERS_STORAGE_KEY) || '[]',
    );
    if (Array.isArray(saved)) {
      const meters = saved.filter(
        (meter): meter is string =>
          typeof meter === 'string' && meter.trim().length > 0,
      );
      if (meters.length > 0) return meters;
    }
  } catch {
    // Fall back to the two initial building meters.
  }
  return [...DEFAULT_ELECTRICITY_METERS];
};

export const saveElectricityMeters = (meters: string[]) => {
  localStorage.setItem(
    ELECTRICITY_METERS_STORAGE_KEY,
    JSON.stringify(meters),
  );
};
