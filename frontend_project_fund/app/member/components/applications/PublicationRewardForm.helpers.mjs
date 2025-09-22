export const shouldDisableSubmitButton = ({
  loading,
  saving,
  subcategoryId,
  subcategoryBudgetId,
  declarations,
  authorNameList,
  signature,
}) => {
  const hasAuthorNames = (authorNameList || '').trim().length > 0;
  const hasSignature = (signature || '').trim().length > 0;

  return (
    loading ||
    saving ||
    !subcategoryId ||
    !subcategoryBudgetId ||
    !declarations?.confirmNoPreviousFunding ||
    !declarations?.agreeToRegulations ||
    !hasAuthorNames ||
    !hasSignature
  );
};

export const getAuthorSubmissionFields = (formData = {}) => {
  const authorNameList = (formData.author_name_list || '').trim();
  const signature = (formData.signature || '').trim();

  return {
    author_name_list: authorNameList,
    signature,
  };
};