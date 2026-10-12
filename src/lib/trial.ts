/**
 * TRIAL MODE: any email and any password signs in (an account is created on first use, the password is
 * never checked). It is ON by default for this trial build and is switched off with TRIAL_MODE=false.
 * Because anyone can claim any email, nobody is treated as an admin while it is on.
 */
export function isTrialMode(): boolean {
  return process.env.TRIAL_MODE !== "false";
}

export const TRIAL_NOTICE =
  "Trial build: any email and any password works. There is no password check, so don't use a real password and don't put anything private here.";
