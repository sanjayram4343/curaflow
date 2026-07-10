import Department from '../models/Department.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all departments (filtered by hospital if not Super Admin)
// @route   GET /api/departments
// @access  Private
export const getDepartments = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'Super Admin') {
      query.hospital = req.user.hospital;
    }

    const departments = await Department.find(query).populate('hospital').sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a department
// @route   POST /api/departments
// @access  Private (Admin only)
export const createDepartment = async (req, res, next) => {
  const { name, code, hospital } = req.body;

  try {
    let finalHospital = hospital;
    if (req.user.role !== 'Super Admin') {
      finalHospital = req.user.hospital;
    }

    if (!finalHospital) {
      res.status(400);
      throw new Error('Hospital is required');
    }

    const department = await Department.create({
      name,
      code,
      hospital: finalHospital,
    });

    await logActivity(req.user._id, 'Department Created', `Created department: ${department.name} (${department.code})`, req);

    res.status(201).json(department);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private (Admin only)
export const updateDepartment = async (req, res, next) => {
  const { name, code } = req.body;

  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404);
      throw new Error('Department not found');
    }

    // Role checks
    if (req.user.role !== 'Super Admin' && department.hospital.toString() !== req.user.hospital.toString()) {
      res.status(403);
      throw new Error('Not authorized to modify this department');
    }

    department.name = name || department.name;
    department.code = code || department.code;

    const updatedDepartment = await department.save();

    await logActivity(req.user._id, 'Department Updated', `Updated department: ${updatedDepartment.name}`, req);

    res.json(updatedDepartment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private (Admin only)
export const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404);
      throw new Error('Department not found');
    }

    // Role checks
    if (req.user.role !== 'Super Admin' && department.hospital.toString() !== req.user.hospital.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this department');
    }

    await department.deleteOne();

    await logActivity(req.user._id, 'Department Deleted', `Deleted department: ${department.name}`, req);

    res.json({ message: 'Department removed' });
  } catch (error) {
    next(error);
  }
};
