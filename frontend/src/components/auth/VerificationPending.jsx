import { useNavigate } from "react-router-dom";

const VerificationPending = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">
          Verify Your Email
        </h2>
        <p className="text-gray-300 mb-4">
          Please check your email for a verification link. The link will expire
          in 24 hours.
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Didn&apos;t receive the email? Check your spam folder or contact support.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="text-blue-500 hover:underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default VerificationPending;
