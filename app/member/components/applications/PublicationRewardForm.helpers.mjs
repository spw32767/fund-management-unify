export const shouldDisableSubmitButton = ({
  loading,
  saving,
  subcategoryId,
  subcategoryBudgetId,
  declarations,
}) => {
  return (
    loading ||
    saving ||
    !subcategoryId ||
    !subcategoryBudgetId ||
    !declarations?.confirmNoPreviousFunding ||
    !declarations?.agreeToRegulations
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