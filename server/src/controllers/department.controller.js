import mongoose from 'mongoose';

import { Department } from '../models/department.model.js';
import { User, USER_ROLES } from '../models/user.model.js';

function createControllerError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

async function getActiveSuperAdmin(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return null;
  }

  return User.findOne({
    _id: userId,
    role: USER_ROLES.SUPER_ADMIN,
    status: 'ACTIVE',
  })
    .select('_id role status')
    .exec();
}

function serializeDepartment(department) {
  return {
    id: String(department._id ?? department.id),
    name: department.name,
    code: department.code,
    description: department.description || '',
    status: department.status,
    hod: department.hod
      ? {
          id: String(department.hod._id ?? department.hod.id),
          fullName: department.hod.fullName || '',
          institutionalId: department.hod.institutionalId || '',
          email: department.hod.email || '',
          status: department.hod.status || '',
        }
      : null,
    createdBy: department.createdBy
      ? String(department.createdBy._id ?? department.createdBy)
      : null,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  };
}

export async function createDepartmentController(req, res, next) {
  try {
    const currentUser = await getActiveSuperAdmin(req.user?.id);

    if (!currentUser) {
      return next(
        createControllerError(
          403,
          'FORBIDDEN',
          'Only an active Super Admin can create departments.',
        ),
      );
    }

    const {
      name,
      code,
      description = '',
    } = req.body;

    const normalizedCode = code.trim().toUpperCase();

    const existingDepartment = await Department.exists({
      code: normalizedCode,
    });

    if (existingDepartment) {
      return next(
        createControllerError(
          409,
          'DEPARTMENT_CODE_EXISTS',
          'A department with this code already exists.',
        ),
      );
    }

    const department = await Department.create({
      name: name.trim(),
      code: normalizedCode,
      description: description.trim(),
      createdBy: currentUser._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: {
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
          description: department.description,
          hod: department.hod,
          status: department.status,
          createdAt: department.createdAt,
        },
      },
    });
  } catch (error) {
    if (
      error instanceof mongoose.Error &&
      error.name === 'ValidationError'
    ) {
      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
    }

    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'DEPARTMENT_CODE_EXISTS';
      error.message = 'A department with this code already exists.';
    }

    return next(error);
  }
}

export async function listDepartmentsController(req, res, next) {
  try {
    const currentUser = await getActiveSuperAdmin(req.user?.id);

    if (!currentUser) {
      return next(
        createControllerError(
          403,
          'FORBIDDEN',
          'Only an active Super Admin can view departments.',
        ),
      );
    }

    const departments = await Department.find({})
      .select(
        'name code description hod status createdBy createdAt updatedAt',
      )
      .populate({
        path: 'hod',
        select: 'fullName institutionalId email status',
      })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully.',
      data: departments.map(serializeDepartment),
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDepartmentDetailsController(req, res, next) {
  try {
    const currentUser = await getActiveSuperAdmin(req.user?.id);

    if (!currentUser) {
      return next(
        createControllerError(
          403,
          'FORBIDDEN',
          'Only an active Super Admin can view department details.',
        ),
      );
    }

    const { departmentId } = req.params;

    if (!mongoose.isValidObjectId(departmentId)) {
      return next(
        createControllerError(
          400,
          'INVALID_DEPARTMENT_ID',
          'The department ID is invalid.',
        ),
      );
    }

    const department = await Department.findById(departmentId)
      .select(
        'name code description hod status createdBy createdAt updatedAt',
      )
      .populate({
        path: 'hod',
        select: 'fullName institutionalId email status',
      })
      .lean()
      .exec();

    if (!department) {
      return next(
        createControllerError(
          404,
          'DEPARTMENT_NOT_FOUND',
          'The requested department was not found.',
        ),
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Department details retrieved successfully.',
      data: serializeDepartment(department),
    });
  } catch (error) {
    return next(error);
  }
}
export async function manageDepartmentHodAssignmentController(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const currentUser = await User.findById(req.user?.id)
      .select('role status')
      .exec();

    if (
      !currentUser
      || currentUser.status !== 'ACTIVE'
      || currentUser.role !== USER_ROLES.SUPER_ADMIN
    ) {
      const error = new Error(
        'Only an active Super Admin can manage HOD assignments.',
      );

      error.statusCode = currentUser ? 403 : 401;
      error.code = currentUser ? 'FORBIDDEN' : 'UNAUTHORIZED';

      return next(error);
    }

    const { departmentId } = req.params;
    const { hodId } = req.body;

    if (!mongoose.isValidObjectId(departmentId)) {
      const error = new Error('A valid department ID is required.');
      error.statusCode = 400;
      error.code = 'INVALID_DEPARTMENT_ID';

      return next(error);
    }

    if (hodId !== null && !mongoose.isValidObjectId(hodId)) {
      const error = new Error('A valid HOD account ID is required.');
      error.statusCode = 400;
      error.code = 'INVALID_HOD_ID';

      return next(error);
    }

    let assignmentResult;

    await session.withTransaction(async () => {
      const department = await Department.findById(departmentId)
        .session(session)
        .exec();

      if (!department) {
        const error = new Error('Department not found.');
        error.statusCode = 404;
        error.code = 'DEPARTMENT_NOT_FOUND';

        throw error;
      }

      if (hodId !== null && department.status !== 'ACTIVE') {
        const error = new Error(
          'An HOD cannot be assigned to an inactive department.',
        );

        error.statusCode = 409;
        error.code = 'DEPARTMENT_INACTIVE';

        throw error;
      }

      const previousHodId = department.hod
        ? department.hod.toString()
        : null;

      const requestedHodId = hodId === null
        ? null
        : new mongoose.Types.ObjectId(hodId).toString();

      // Repeating the existing assignment is a safe no-op.
      if (previousHodId === requestedHodId) {
        assignmentResult = {
          departmentId: department.id,
          departmentName: department.name,
          hodId: previousHodId,
          changed: false,
        };

        return;
      }

      let previousHod = null;

      if (previousHodId) {
        previousHod = await User.findById(previousHodId)
          .session(session)
          .exec();

        if (
          !previousHod
          || previousHod.role !== USER_ROLES.HOD
          || previousHod.department?.toString() !== department.id
        ) {
          const error = new Error(
            'The current department and HOD assignment is inconsistent. '
            + 'Resolve the existing assignment before changing it.',
          );

          error.statusCode = 409;
          error.code = 'HOD_ASSIGNMENT_INCONSISTENT';

          throw error;
        }
      }

      let nextHod = null;
      let previousDepartmentOfNextHod = null;

      if (requestedHodId) {
        nextHod = await User.findById(requestedHodId)
          .session(session)
          .exec();

        if (
          !nextHod
          || nextHod.role !== USER_ROLES.HOD
          || nextHod.status !== 'ACTIVE'
        ) {
          const error = new Error(
            'The selected account is not an active HOD.',
          );

          error.statusCode = 422;
          error.code = 'INVALID_HOD_ACCOUNT';

          throw error;
        }

        const nextHodDepartmentId = nextHod.department
          ? nextHod.department.toString()
          : null;

        if (
          nextHodDepartmentId
          && nextHodDepartmentId !== department.id
        ) {
          previousDepartmentOfNextHod = await Department.findById(
            nextHodDepartmentId,
          )
            .session(session)
            .exec();

          if (
            !previousDepartmentOfNextHod
            || previousDepartmentOfNextHod.hod?.toString()
              !== nextHod.id
          ) {
            const error = new Error(
              'The selected HOD has an inconsistent department assignment.',
            );

            error.statusCode = 409;
            error.code = 'HOD_ASSIGNMENT_INCONSISTENT';

            throw error;
          }
        } else if (
          nextHodDepartmentId === department.id
          && previousHodId !== nextHod.id
        ) {
          const error = new Error(
            'The selected HOD is already linked to this department, '
            + 'but the department assignment does not match.',
          );

          error.statusCode = 409;
          error.code = 'HOD_ASSIGNMENT_INCONSISTENT';

          throw error;
        }
      }

      // Release the department's existing HOD.
      if (previousHod) {
        previousHod.department = null;
        await previousHod.save({ session });
      }

      // If the selected HOD belongs to another department, release
      // that department before transferring the HOD.
      if (previousDepartmentOfNextHod) {
        previousDepartmentOfNextHod.hod = null;

        await previousDepartmentOfNextHod.save({ session });
      }

      // Assign the selected HOD to the target department.
      if (nextHod) {
        nextHod.department = department._id;
        await nextHod.save({ session });
      }

      department.hod = nextHod ? nextHod._id : null;
      await department.save({ session });

      assignmentResult = {
        departmentId: department.id,
        departmentName: department.name,
        previousHodId,
        hodId: nextHod ? nextHod.id : null,
        changed: true,
      };
    });

    return res.status(200).json({
      success: true,
      message: assignmentResult.changed
        ? 'Department HOD assignment updated successfully.'
        : 'The requested HOD is already assigned to this department.',
      data: assignmentResult,
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'HOD_ASSIGNMENT_CONFLICT';
      error.message =
        'The HOD assignment conflicts with another update. Please retry.';
    }

    return next(error);
  } finally {
    await session.endSession();
  }
}