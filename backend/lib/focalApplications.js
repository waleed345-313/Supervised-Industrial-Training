/**
 * Company focal must not see CGPA-screened exhaust applications.
 * Replacement-routed applications remain visible even if marked exhaust (edge case).
 */
function focalVisibleApplicationFilter() {
  return {
    $or: [{ status: { $ne: 'exhaust' } }, { isReplacement: true }],
  };
}

function isHiddenFromCompanyFocal(application) {
  if (!application) return false;
  return application.status === 'exhaust' && !application.isReplacement;
}

module.exports = {
  focalVisibleApplicationFilter,
  isHiddenFromCompanyFocal,
};
