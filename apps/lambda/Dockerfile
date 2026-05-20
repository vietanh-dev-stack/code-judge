# Sử dụng hình ảnh Python chính thức của AWS Lambda
FROM public.ecr.aws/lambda/python:3.10

# Cài đặt GCC (cho C++), Node.js (cho JS) và OpenJDK (cho Java)
RUN yum update -y && \
    yum install -y gcc-c++ nodejs java-17-amazon-corretto-devel

# Copy file code vào thư mục làm việc của Lambda
COPY app.py ${LAMBDA_TASK_ROOT}

# Thiết lập lệnh chạy chính
CMD [ "app.handler" ]
