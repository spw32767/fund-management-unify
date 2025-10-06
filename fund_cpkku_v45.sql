-- phpMyAdmin SQL Dump
-- version 4.9.5deb2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: 06 ต.ค. 2025 เมื่อ 11:27 PM
-- เวอร์ชันของเซิร์ฟเวอร์: 11.1.6-MariaDB-ubu2004
-- PHP Version: 7.4.3-4ubuntu2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fund_cpkku`
--

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `research_fund_event_files`
--

CREATE TABLE `research_fund_event_files` (
  `event_file_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `file_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `research_fund_event_files`
--

INSERT INTO `research_fund_event_files` (`event_file_id`, `event_id`, `file_id`, `created_at`) VALUES
(4, 17, 345, '2025-10-06 22:32:29'),
(5, 18, 346, '2025-10-06 22:33:03'),
(6, 19, 347, '2025-10-06 22:34:24');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `research_fund_event_files`
--
ALTER TABLE `research_fund_event_files`
  ADD PRIMARY KEY (`event_file_id`),
  ADD KEY `idx_rfef_event_id` (`event_id`),
  ADD KEY `idx_rfef_file_id` (`file_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `research_fund_event_files`
--
ALTER TABLE `research_fund_event_files`
  MODIFY `event_file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `research_fund_event_files`
--
ALTER TABLE `research_fund_event_files`
  ADD CONSTRAINT `fk_rfef_event` FOREIGN KEY (`event_id`) REFERENCES `research_fund_admin_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfef_file` FOREIGN KEY (`file_id`) REFERENCES `file_uploads` (`file_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
