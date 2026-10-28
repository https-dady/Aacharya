import {
  createStudentActivationChallenge,
  activateStudentAccount,
} from '../services/provisioning/student-activation.service.js';

export async function createStudentActivationController(
  req,
  res,
  next,
) {
  try {
    const result = await createStudentActivationChallenge({
      mentorId: req.user.id,
      studentId: req.params.studentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Student activation email sent successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function activateStudentAccountController(
  req,
  res,
  next,
) {
  try {
    const result = await activateStudentAccount({
      challengeId: req.body.challengeId,
      activationToken: req.body.activationToken,
      newPassword: req.body.newPassword,
    });

    return res.status(200).json({
      success: true,
      message: 'Student account activated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}