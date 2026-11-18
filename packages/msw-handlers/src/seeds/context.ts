import { base, en, Faker } from "@faker-js/faker";
import { toDBString } from "@shinju-date/temporal-fns";

/**
 * The seed of faker. It is fixed, so the seed data is the same every time
 * for the same `now`.
 */
const FAKER_SEED = 7088;

/** What every scenario of the seed data is made with. */
export interface SeedContext {
  /** Faker with a fixed seed, which the scenarios draw random values from */
  faker: Faker;
  /** The time that the seed data is made around */
  now: Temporal.Instant;
}

/**
 * A context of the seed data around `now`. Each call has a faker of its own
 * that starts from the same seed, so the same calls give the same values.
 */
export function createSeedContext(now: Temporal.Instant): SeedContext {
  return {
    faker: new Faker({ locale: [en, base], seed: FAKER_SEED }),
    now,
  };
}

/**
 * A random time within `days` before `now`, as it is saved in a
 * `TIMESTAMPTZ` column (in seconds, without milliseconds).
 */
export function randomPast({ faker, now }: SeedContext, days: number): string {
  return toDBString(
    now.subtract({ seconds: faker.number.int({ max: days * 86_400, min: 1 }) })
  );
}

/**
 * A random time within `days` after `now`, as it is saved in a
 * `TIMESTAMPTZ` column (in seconds, without milliseconds).
 */
export function randomFuture(
  { faker, now }: SeedContext,
  days: number
): string {
  return toDBString(
    now.add({ seconds: faker.number.int({ max: days * 86_400, min: 1 }) })
  );
}

/** A random placeholder of an image, such as `blur_data_url`. */
export function randomBlurDataUrl({ faker }: SeedContext): string {
  return `data:image/jpeg;base64,${faker.string.alphanumeric(50)}`;
}

/** A random duration of a video of 1 to 3 hours, such as `PT1H23M45S`. */
export function randomLongDuration({ faker }: SeedContext): string {
  return `PT${faker.number.int({ max: 3, min: 1 })}H${faker.number.int({ max: 59, min: 0 })}M${faker.number.int({ max: 59, min: 0 })}S`;
}

/** A random duration of a short video of 15 to 60 seconds. */
export function randomShortDuration({ faker }: SeedContext): string {
  return `PT${faker.number.int({ max: 60, min: 15 })}S`;
}
